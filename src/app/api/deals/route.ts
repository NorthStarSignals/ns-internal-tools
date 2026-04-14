import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabase();

    const { data: deals, error } = await supabase
      .from("deals")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch file counts and red flag counts for each deal
    const dealIds = deals.map((d: { deal_id: string }) => d.deal_id);

    const { data: fileCounts } = await supabase
      .from("data_room_files")
      .select("deal_id")
      .in("deal_id", dealIds);

    const { data: redFlags } = await supabase
      .from("red_flags")
      .select("deal_id, severity")
      .in("deal_id", dealIds)
      .eq("is_dismissed", false);

    const fileCountMap: Record<string, number> = {};
    for (const f of fileCounts || []) {
      fileCountMap[f.deal_id] = (fileCountMap[f.deal_id] || 0) + 1;
    }

    const flagCountMap: Record<string, { critical: number; warning: number; note: number }> = {};
    for (const rf of redFlags || []) {
      if (!flagCountMap[rf.deal_id]) {
        flagCountMap[rf.deal_id] = { critical: 0, warning: 0, note: 0 };
      }
      flagCountMap[rf.deal_id][rf.severity as "critical" | "warning" | "note"]++;
    }

    const enrichedDeals = deals.map((deal: { deal_id: string }) => ({
      ...deal,
      file_count: fileCountMap[deal.deal_id] || 0,
      critical_count: flagCountMap[deal.deal_id]?.critical || 0,
      warning_count: flagCountMap[deal.deal_id]?.warning || 0,
      note_count: flagCountMap[deal.deal_id]?.note || 0,
    }));

    return NextResponse.json({ deals: enrichedDeals });
  } catch (err) {
    console.error("GET /api/deals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deal_name, business_type, asking_price, client_name } = body;

    if (!deal_name) {
      return NextResponse.json({ error: "deal_name is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("deals")
      .insert({
        clerk_user_id: userId,
        deal_name,
        business_type: business_type || null,
        asking_price: asking_price || null,
        client_name: client_name || null,
        status: "uploading",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deal: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/deals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
