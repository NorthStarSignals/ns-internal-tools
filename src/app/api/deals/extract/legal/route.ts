import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { LEGAL_EXTRACTION_PROMPT } from "@/lib/claude-prompts";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 60;

interface LegalExtractionResult {
  document_type: string | null;
  counterparty: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  key_terms: Record<string, string> | null;
  change_of_control_clause: string | null;
  termination_provisions: string | null;
  unusual_provisions: string | null;
  risk_level: "critical" | "warning" | "note";
}

const LEGAL_CATEGORIES = [
  "lease",
  "vendor_contract",
  "customer_contract",
  "employee_agreement",
  "operating_agreement",
];

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

    // Fetch legal-category files
    const { data: files, error } = await supabase
      .from("data_room_files")
      .select("*")
      .eq("deal_id", deal_id)
      .in("document_category", LEGAL_CATEGORIES)
      .not("extracted_text", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        message: "No legal documents found. Classify files first.",
        extracts: [],
      });
    }

    // Process in background
    waitUntil(processLegalExtraction(supabase, deal_id, files));

    return NextResponse.json(
      { message: "Legal extraction started", status: "processing", file_count: files.length },
      { status: 202 }
    );
  } catch (err) {
    console.error("POST /api/deals/extract/legal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processLegalExtraction(
  supabase: ReturnType<typeof createServerSupabase>,
  dealId: string,
  files: Array<Record<string, unknown>>
) {
  for (const file of files) {
    try {
      const result = await askClaudeJSON<LegalExtractionResult>(
        LEGAL_EXTRACTION_PROMPT,
        `File: ${file.file_name} (${file.document_category})\n\n${file.extracted_text}`,
        { maxTokens: 8192 }
      );

      const { error: insertError } = await supabase
        .from("legal_extracts")
        .insert({
          deal_id: dealId,
          file_id: file.file_id,
          document_type: result.document_type,
          counterparty: result.counterparty,
          effective_date: result.effective_date,
          expiration_date: result.expiration_date,
          key_terms: result.key_terms,
          change_of_control_clause: result.change_of_control_clause,
          termination_provisions: result.termination_provisions,
          unusual_provisions: result.unusual_provisions,
          risk_level: result.risk_level,
        });

      if (insertError) {
        console.error(`Insert failed for ${file.file_name}:`, insertError);
      }
    } catch (extractErr) {
      console.error(`Legal extraction failed for ${file.file_name}:`, extractErr);
    }
  }
}
