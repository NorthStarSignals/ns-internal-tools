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

    // Sort by severity: critical first, then warning, then note
    const { data, error } = await supabase
      .from("red_flags")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort by severity priority since Supabase can't order by custom enum priority
    const severityOrder = { critical: 0, warning: 1, note: 2 };
    const sorted = (data || []).sort(
      (a, b) =>
        (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
        (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
    );

    return NextResponse.json(sorted);
  } catch (err) {
    console.error("GET /api/deals/red-flags error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
