import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { REQUIREMENT_EXTRACTION_PROMPT } from "@/lib/claude-prompts";

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

    // Build the full text from pages — truncate to avoid huge payloads
    let fullText: string;
    if (Array.isArray(doc.extracted_text)) {
      fullText = doc.extracted_text
        .map((p: { page: number; text: string }) => `--- Page ${p.page} ---\n${p.text}`)
        .join("\n\n");
    } else {
      fullText = String(doc.extracted_text);
    }

    // Truncate to ~30k chars to keep within reasonable limits for fast response
    if (fullText.length > 30000) {
      fullText = fullText.substring(0, 30000) + "\n\n[Document truncated for processing]";
    }

    // Send to Claude for extraction
    const extracted = await askClaudeJSON<ExtractedRequirement[]>(
      REQUIREMENT_EXTRACTION_PROMPT,
      fullText,
      { maxTokens: 8192 }
    );

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return NextResponse.json(
        { error: "No requirements could be extracted" },
        { status: 422 }
      );
    }

    // Get current max sort_order
    const { data: maxSort } = await supabase
      .from("rfp_requirements")
      .select("sort_order")
      .eq("project_id", doc.project_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxSort?.sort_order ?? -1) + 1;

    // Insert all extracted requirements
    const rows = extracted.map((req) => {
      // Sanitize word_limit — Claude sometimes returns strings like "maximum 3 pages"
      let wordLimit: number | null = null;
      if (req.word_limit !== null && req.word_limit !== undefined) {
        const parsed = typeof req.word_limit === "number"
          ? req.word_limit
          : parseInt(String(req.word_limit).replace(/[^\d]/g, ""), 10);
        wordLimit = isNaN(parsed) ? null : parsed;
      }

      // Sanitize page_number similarly
      let pageNumber: number | null = null;
      if (req.page_number !== null && req.page_number !== undefined) {
        const parsed = typeof req.page_number === "number"
          ? req.page_number
          : parseInt(String(req.page_number), 10);
        pageNumber = isNaN(parsed) ? null : parsed;
      }

      return {
        project_id: doc.project_id,
        document_id: document_id,
        section: req.section || null,
        requirement_text: req.requirement_text,
        requirement_type: req.requirement_type || "narrative",
        word_limit: wordLimit,
        page_number: pageNumber,
        sort_order: nextOrder++,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from("rfp_requirements")
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      extracted_count: inserted?.length || 0,
      requirements: inserted,
    });
  } catch (err) {
    console.error("POST /api/rfp/requirements/extract error:", err);
    return NextResponse.json({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
