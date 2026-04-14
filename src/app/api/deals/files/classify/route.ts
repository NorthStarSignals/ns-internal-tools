import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { DOCUMENT_CLASSIFICATION_PROMPT } from "@/lib/claude-prompts";

interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deal_id } = body;

    if (!deal_id) {
      return NextResponse.json({ error: "deal_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify deal ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch all unclassified files with extracted text
    const { data: files, error } = await supabase
      .from("data_room_files")
      .select("*")
      .eq("deal_id", deal_id)
      .is("document_category", null)
      .not("extracted_text", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No unclassified files found", classified: [] });
    }

    const results = [];

    // Process files sequentially to avoid rate limits
    for (const file of files) {
      try {
        // Update status to classifying
        await supabase
          .from("data_room_files")
          .update({ processing_status: "classifying" })
          .eq("file_id", file.file_id);

        const textSnippet = (file.extracted_text as string).substring(0, 3000);

        const classification = await askClaudeJSON<ClassificationResult>(
          DOCUMENT_CLASSIFICATION_PROMPT,
          `File name: ${file.file_name}\n\nDocument text (first 3000 chars):\n${textSnippet}`
        );

        const { error: updateError } = await supabase
          .from("data_room_files")
          .update({
            document_category: classification.category,
            classification_confidence: classification.confidence,
            processing_status: "completed",
          })
          .eq("file_id", file.file_id);

        if (updateError) {
          results.push({ file_id: file.file_id, file_name: file.file_name, error: updateError.message });
        } else {
          results.push({
            file_id: file.file_id,
            file_name: file.file_name,
            category: classification.category,
            confidence: classification.confidence,
          });
        }
      } catch (classifyErr) {
        console.error(`Classification failed for ${file.file_name}:`, classifyErr);
        await supabase
          .from("data_room_files")
          .update({ processing_status: "failed" })
          .eq("file_id", file.file_id);
        results.push({
          file_id: file.file_id,
          file_name: file.file_name,
          error: "Classification failed",
        });
      }
    }

    // Re-fetch all files for the deal so frontend gets full updated records
    const { data: updatedFiles } = await supabase
      .from("data_room_files")
      .select("*")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ files: updatedFiles || [], classified: results });
  } catch (err) {
    console.error("POST /api/deals/files/classify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
