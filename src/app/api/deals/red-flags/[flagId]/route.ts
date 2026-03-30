import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { flagId } = await params;
    const body = await request.json();

    const supabase = createServerSupabase();

    // Verify the flag belongs to one of the user's deals
    const { data: flag } = await supabase
      .from("red_flags")
      .select("flag_id, deal_id")
      .eq("flag_id", flagId)
      .single();

    if (!flag) {
      return NextResponse.json({ error: "Red flag not found" }, { status: 404 });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", flag.deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only allow updating specific analyst fields
    const allowedFields = ["analyst_notes", "analyst_override_severity", "is_dismissed"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("red_flags")
      .update(updates)
      .eq("flag_id", flagId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/deals/red-flags/[flagId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
