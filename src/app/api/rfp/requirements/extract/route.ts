import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { REQUIREMENT_EXTRACTION_PROMPT } from "@/lib/claude-prompts";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 60;

interface ExtractedRequirement {
  section: string | null;
  requirement_text: string;
  requirement_type: "narrative" | "technical" | "compliance" | "pricing";
  page_number: number | null;
  word_limit: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json({ error: "document_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from("rfp_documents")
      .select("*")
      .eq("document_id", document_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify ownership via project
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", doc.project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!doc.extracted_text || doc.processing_status !== "completed") {
      return NextResponse.json(
        { error: "Document text has not been extracted yet" },
        { status: 400 }
      );
    }

    // Build the full text from pages
    const fullText = Array.isArray(doc.extracted_text)
      ? doc.extracted_text
          .map((p: { page: number; text: string }) => `--- Page ${p.page} ---\n${p.text}`)
          .join("\n\n")
      : String(doc.extracted_text);

    // Use waitUntil to process in background after returning 202
    waitUntil(
      processExtraction(supabase, doc.project_id, document_id, fullText)
    );

    return NextResponse.json(
      { message: "Extraction started", status: "processing" },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/rfp/requirements/extract error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processExtraction(
  supabase: ReturnType<typeof createServerSupabase>,
  projectId: string,
  documentId: string,
  fullText: string
) {
  try {
    // Send to Claude for extraction
    const extracted = await askClaudeJSON<ExtractedRequirement[]>(
      REQUIREMENT_EXTRACTION_PROMPT,
      fullText,
      { maxTokens: 8192 }
    );

    if (!Array.isArray(extracted) || extracted.length === 0) {
      console.error("No requirements extracted from document:", documentId);
      return;
    }

    // Get current max sort_order
    const { data: maxSort } = await supabase
      .from("rfp_requirements")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxSort?.sort_order ?? -1) + 1;

    // Insert all extracted requirements
    const rows = extracted.map((req) => ({
      project_id: projectId,
      document_id: documentId,
      section: req.section || null,
      requirement_text: req.requirement_text,
      requirement_type: req.requirement_type || "narrative",
      word_limit: req.word_limit || null,
      page_number: req.page_number || null,
      sort_order: nextOrder++,
    }));

    const { error: insertError } = await supabase
      .from("rfp_requirements")
      .insert(rows);

    if (insertError) {
      console.error("Failed to insert extracted requirements:", insertError);
    } else {
      console.log(`Successfully extracted ${rows.length} requirements from document ${documentId}`);
    }
  } catch (err) {
    console.error("Background extraction failed for document:", documentId, err);
  }
}
