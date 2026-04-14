import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { RED_FLAG_ANALYSIS_PROMPT } from "@/lib/claude-prompts";

export const maxDuration = 60;

interface RedFlagResult {
  severity: "critical" | "warning" | "note";
  category: "financial" | "legal" | "operational" | "concentration";
  title: string;
  description: string;
  source_reference: string | null;
  recommendation: string | null;
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
      .select("*")
      .eq("deal_id", deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch all extracted data
    const [financialsRes, legalsRes, filesRes] = await Promise.all([
      supabase.from("financial_extracts").select("*").eq("deal_id", deal_id).order("period"),
      supabase.from("legal_extracts").select("*").eq("deal_id", deal_id),
      supabase
        .from("data_room_files")
        .select("file_id, file_name, document_category, classification_confidence")
        .eq("deal_id", deal_id),
    ]);

    const financials = financialsRes.data || [];
    const legals = legalsRes.data || [];
    const files = filesRes.data || [];

    // Build comprehensive context for Claude
    const context = `
DEAL INFORMATION:
- Deal Name: ${deal.deal_name}
- Business Type: ${deal.business_type || "Not specified"}
- Asking Price: ${deal.asking_price ? `$${deal.asking_price.toLocaleString()}` : "Not specified"}

DOCUMENT INVENTORY (${files.length} files):
${files.map((f) => `- ${f.file_name} [${f.document_category || "unclassified"}]`).join("\n")}

FINANCIAL DATA (${financials.length} periods):
${JSON.stringify(financials, null, 2)}

LEGAL/CONTRACT DATA (${legals.length} documents):
${JSON.stringify(legals, null, 2)}
`;

    const redFlags = await askClaudeJSON<RedFlagResult[]>(
      RED_FLAG_ANALYSIS_PROMPT,
      context,
      { maxTokens: 8192 }
    );

    const flagsArray = Array.isArray(redFlags) ? redFlags : [redFlags];

    // Delete existing red flags for this deal before inserting new ones
    await supabase.from("red_flags").delete().eq("deal_id", deal_id);

    const insertedFlags = [];

    for (const flag of flagsArray) {
      const { data: inserted, error: insertError } = await supabase
        .from("red_flags")
        .insert({
          deal_id,
          severity: flag.severity,
          category: flag.category,
          title: flag.title,
          description: flag.description,
          source_reference: flag.source_reference,
          recommendation: flag.recommendation,
          is_dismissed: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to insert red flag:", insertError);
      } else {
        insertedFlags.push(inserted);
      }
    }

    // Update deal status to review
    await supabase
      .from("deals")
      .update({ status: "review", updated_at: new Date().toISOString() })
      .eq("deal_id", deal_id);

    return NextResponse.json({
      red_flags: insertedFlags,
      summary: {
        total: insertedFlags.length,
        critical: insertedFlags.filter((f) => f.severity === "critical").length,
        warning: insertedFlags.filter((f) => f.severity === "warning").length,
        note: insertedFlags.filter((f) => f.severity === "note").length,
      },
    });
  } catch (err) {
    console.error("POST /api/deals/analyze error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
