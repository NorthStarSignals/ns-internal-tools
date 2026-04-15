import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaudeJSON } from "@/lib/claude";
import { FINANCIAL_EXTRACTION_PROMPT } from "@/lib/claude-prompts";

export const maxDuration = 60;

interface FinancialPeriod {
  period: string;
  revenue: number | null;
  cogs: number | null;
  gross_margin: number | null;
  operating_expenses: Record<string, number> | null;
  net_income: number | null;
  ebitda: number | null;
  cash_balance: number | null;
  debt_outstanding: number | null;
}

const FINANCIAL_CATEGORIES = ["tax_return", "pnl", "balance_sheet", "cash_flow", "bank_statement"];

function safeNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(parsed) ? null : parsed;
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

    // Fetch financial-category files
    const { data: files, error } = await supabase
      .from("data_room_files")
      .select("*")
      .eq("deal_id", deal_id)
      .in("document_category", FINANCIAL_CATEGORIES)
      .not("extracted_text", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        message: "No financial documents found. Classify files first.",
        extracts: [],
      });
    }

    // Update deal status to processing
    await supabase.from("deals").update({ status: "processing", updated_at: new Date().toISOString() }).eq("deal_id", deal_id);

    const allExtracts = [];

    // Process files sequentially to avoid rate limits
    for (const file of files) {
      try {
        const periods = await askClaudeJSON<FinancialPeriod[]>(
          FINANCIAL_EXTRACTION_PROMPT,
          `File: ${file.file_name} (${file.document_category})\n\n${file.extracted_text}`,
          { maxTokens: 8192 }
        );

        const periodsArray = Array.isArray(periods) ? periods : [periods];

        for (const period of periodsArray) {
          const { data: extract, error: insertError } = await supabase
            .from("financial_extracts")
            .insert({
              deal_id,
              file_id: file.file_id,
              period: period.period,
              revenue: safeNumber(period.revenue),
              cogs: safeNumber(period.cogs),
              gross_margin: safeNumber(period.gross_margin),
              operating_expenses: period.operating_expenses,
              net_income: safeNumber(period.net_income),
              ebitda: safeNumber(period.ebitda),
              cash_balance: safeNumber(period.cash_balance),
              debt_outstanding: safeNumber(period.debt_outstanding),
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Insert failed for period ${period.period}:`, insertError);
          } else {
            allExtracts.push(extract);
          }
        }
      } catch (extractErr) {
        console.error(`Financial extraction failed for ${file.file_name}:`, extractErr);
      }
    }

    return NextResponse.json({ extracts: allExtracts });
  } catch (err) {
    console.error("POST /api/deals/extract/financials error:", err);
    return NextResponse.json({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
