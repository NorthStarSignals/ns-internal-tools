import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser } from "@/lib/time-tracker";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getTTUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: "Time tracker profile not found" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabase();

    // Find all draft entries for this user
    const { data: draftEntries, error: fetchError } = await supabase
      .from("tt_time_entries")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "draft");

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!draftEntries || draftEntries.length === 0) {
      return NextResponse.json({ message: "No draft entries to submit", count: 0 });
    }

    const entryIds = draftEntries.map((e: { id: string }) => e.id);

    const { error: updateError } = await supabase
      .from("tt_time_entries")
      .update({ status: "submitted" })
      .in("id", entryIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `${entryIds.length} entries submitted`,
      count: entryIds.length,
    });
  } catch (err) {
    console.error("POST /api/time-tracker/entries/submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
