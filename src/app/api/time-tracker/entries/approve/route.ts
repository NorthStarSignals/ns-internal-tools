import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/time-tracker";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(userId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const body = await request.json();
    const { entry_ids, all, user_id, project_id, action } = body;

    const isReject = action === "reject";
    const fromStatus = isReject ? "submitted" : "submitted";
    const toStatus = isReject ? "draft" : "approved";

    const supabase = createServerSupabase();

    if (all) {
      // Approve/reject all submitted entries, with optional filters
      let query = supabase
        .from("tt_time_entries")
        .select("id")
        .eq("status", fromStatus);

      if (user_id) {
        query = query.eq("user_id", user_id);
      }
      if (project_id) {
        query = query.eq("project_id", project_id);
      }

      const { data: entries, error: fetchError } = await query;

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      if (!entries || entries.length === 0) {
        return NextResponse.json({
          message: "No submitted entries found",
          count: 0,
        });
      }

      const ids = entries.map((e: { id: string }) => e.id);

      const { error: updateError } = await supabase
        .from("tt_time_entries")
        .update({ status: toStatus })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: `${ids.length} entries ${isReject ? "rejected" : "approved"}`,
        count: ids.length,
      });
    }

    if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
      return NextResponse.json(
        { error: "entry_ids array is required, or set all=true" },
        { status: 400 }
      );
    }

    // Verify all entries are in the correct status
    const { data: entries, error: fetchError } = await supabase
      .from("tt_time_entries")
      .select("id, status")
      .in("id", entry_ids);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const invalidEntries = (entries || []).filter(
      (e: { status: string }) => e.status !== fromStatus
    );
    if (invalidEntries.length > 0) {
      return NextResponse.json(
        {
          error: `${invalidEntries.length} entries are not in '${fromStatus}' status`,
          invalid_ids: invalidEntries.map((e: { id: string }) => e.id),
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("tt_time_entries")
      .update({ status: toStatus })
      .in("id", entry_ids);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `${entry_ids.length} entries ${isReject ? "rejected" : "approved"}`,
      count: entry_ids.length,
    });
  } catch (err) {
    console.error("POST /api/time-tracker/entries/approve error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
