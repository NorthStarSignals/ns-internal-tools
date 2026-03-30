import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dealId = request.nextUrl.searchParams.get("deal_id");
    if (!dealId) {
      return NextResponse.json({ error: "deal_id query param is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify deal ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", dealId)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("deal_benchmarks")
      .select("*")
      .eq("deal_id", dealId)
      .order("metric_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/deals/benchmark error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function median(values: number[]): number {
  return percentile(values, 50);
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

    // Fetch the deal
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("deal_id", deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Get this deal's most recent financial extract
    const { data: dealFinancials } = await supabase
      .from("financial_extracts")
      .select("*")
      .eq("deal_id", deal_id)
      .order("period", { ascending: false })
      .limit(1);

    if (!dealFinancials || dealFinancials.length === 0) {
      return NextResponse.json({
        error: "No financial data for this deal. Run financial extraction first.",
      }, { status: 400 });
    }

    const latestFinancial = dealFinancials[0];

    // Find all completed deals with the same business_type (for benchmarking)
    let compQuery = supabase
      .from("deals")
      .select("deal_id")
      .eq("clerk_user_id", userId)
      .eq("status", "completed")
      .neq("deal_id", deal_id);

    if (deal.business_type) {
      compQuery = compQuery.eq("business_type", deal.business_type);
    }

    const { data: compDeals } = await compQuery;
    const compDealIds = (compDeals || []).map((d) => d.deal_id);

    // Define metrics to benchmark
    const metrics: { name: string; field: keyof typeof latestFinancial }[] = [
      { name: "revenue", field: "revenue" },
      { name: "gross_margin", field: "gross_margin" },
      { name: "net_income", field: "net_income" },
      { name: "ebitda", field: "ebitda" },
      { name: "cash_balance", field: "cash_balance" },
      { name: "debt_outstanding", field: "debt_outstanding" },
    ];

    // Calculate derived metrics
    const grossMarginPct =
      latestFinancial.revenue && latestFinancial.gross_margin
        ? (latestFinancial.gross_margin / latestFinancial.revenue) * 100
        : null;

    const revenueMultiple =
      deal.asking_price && latestFinancial.revenue
        ? deal.asking_price / latestFinancial.revenue
        : null;

    const ebitdaMultiple =
      deal.asking_price && latestFinancial.ebitda
        ? deal.asking_price / latestFinancial.ebitda
        : null;

    // Fetch comparable financials
    let compFinancials: Record<string, number[]> = {};
    let compGrossMarginPcts: number[] = [];
    let compRevenueMultiples: number[] = [];
    let compEbitdaMultiples: number[] = [];

    if (compDealIds.length > 0) {
      const { data: compFinData } = await supabase
        .from("financial_extracts")
        .select("*, deals!inner(asking_price)")
        .in("deal_id", compDealIds)
        .order("period", { ascending: false });

      // Take only the most recent period per deal
      const latestByDeal: Record<string, typeof compFinData extends (infer T)[] | null ? T : never> = {};
      for (const cf of compFinData || []) {
        if (!latestByDeal[cf.deal_id]) {
          latestByDeal[cf.deal_id] = cf;
        }
      }

      for (const cf of Object.values(latestByDeal)) {
        for (const m of metrics) {
          const val = cf[m.field];
          if (val != null && typeof val === "number") {
            if (!compFinancials[m.name]) compFinancials[m.name] = [];
            compFinancials[m.name].push(val);
          }
        }
        if (cf.revenue && cf.gross_margin) {
          compGrossMarginPcts.push((cf.gross_margin / cf.revenue) * 100);
        }
        const askingPrice = (cf as Record<string, unknown>).deals &&
          typeof (cf as Record<string, unknown>).deals === "object"
          ? ((cf as Record<string, unknown>).deals as { asking_price: number | null }).asking_price
          : null;
        if (askingPrice && cf.revenue) {
          compRevenueMultiples.push(askingPrice / cf.revenue);
        }
        if (askingPrice && cf.ebitda) {
          compEbitdaMultiples.push(askingPrice / cf.ebitda);
        }
      }
    }

    // Delete existing benchmarks for this deal
    await supabase.from("deal_benchmarks").delete().eq("deal_id", deal_id);

    const benchmarks = [];

    // Insert base metric benchmarks
    for (const m of metrics) {
      const dealValue = latestFinancial[m.field] as number | null;
      const compValues = compFinancials[m.name] || [];

      benchmarks.push({
        deal_id,
        metric_name: m.name,
        deal_value: dealValue,
        benchmark_median: compValues.length > 0 ? median(compValues) : null,
        benchmark_p25: compValues.length > 0 ? percentile(compValues, 25) : null,
        benchmark_p75: compValues.length > 0 ? percentile(compValues, 75) : null,
        sample_size: compValues.length,
      });
    }

    // Insert derived metric benchmarks
    benchmarks.push({
      deal_id,
      metric_name: "gross_margin_pct",
      deal_value: grossMarginPct,
      benchmark_median: compGrossMarginPcts.length > 0 ? median(compGrossMarginPcts) : null,
      benchmark_p25: compGrossMarginPcts.length > 0 ? percentile(compGrossMarginPcts, 25) : null,
      benchmark_p75: compGrossMarginPcts.length > 0 ? percentile(compGrossMarginPcts, 75) : null,
      sample_size: compGrossMarginPcts.length,
    });

    benchmarks.push({
      deal_id,
      metric_name: "revenue_multiple",
      deal_value: revenueMultiple,
      benchmark_median: compRevenueMultiples.length > 0 ? median(compRevenueMultiples) : null,
      benchmark_p25: compRevenueMultiples.length > 0 ? percentile(compRevenueMultiples, 25) : null,
      benchmark_p75: compRevenueMultiples.length > 0 ? percentile(compRevenueMultiples, 75) : null,
      sample_size: compRevenueMultiples.length,
    });

    benchmarks.push({
      deal_id,
      metric_name: "ebitda_multiple",
      deal_value: ebitdaMultiple,
      benchmark_median: compEbitdaMultiples.length > 0 ? median(compEbitdaMultiples) : null,
      benchmark_p25: compEbitdaMultiples.length > 0 ? percentile(compEbitdaMultiples, 25) : null,
      benchmark_p75: compEbitdaMultiples.length > 0 ? percentile(compEbitdaMultiples, 75) : null,
      sample_size: compEbitdaMultiples.length,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("deal_benchmarks")
      .insert(benchmarks)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (err) {
    console.error("POST /api/deals/benchmark error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
