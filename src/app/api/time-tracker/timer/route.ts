import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser } from "@/lib/time-tracker";

function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

export async function GET() {
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

    const { data: activeEntry } = await supabase
      .from("tt_time_entries")
      .select("*, tt_projects(name, client)")
      .eq("user_id", user.id)
      .not("start_time", "is", null)
      .is("end_time", null)
      .single();

    return NextResponse.json({ active_timer: activeEntry || null });
  } catch (err) {
    console.error("GET /api/time-tracker/timer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action } = body;

    const supabase = createServerSupabase();

    if (action === "clock_in") {
      const { project_id } = body;
      if (!project_id) {
        return NextResponse.json(
          { error: "project_id is required for clock_in" },
          { status: 400 }
        );
      }

      // Check for existing active timer
      const { data: existing } = await supabase
        .from("tt_time_entries")
        .select("id")
        .eq("user_id", user.id)
        .not("start_time", "is", null)
        .is("end_time", null)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "You already have an active timer. Clock out first." },
          { status: 409 }
        );
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("tt_time_entries")
        .insert({
          user_id: user.id,
          project_id,
          date: today,
          start_time: now.toISOString(),
          hours: 0,
          status: "draft",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 201 });
    }

    if (action === "clock_out") {
      const { entry_id, notes } = body;
      if (!entry_id) {
        return NextResponse.json(
          { error: "entry_id is required for clock_out" },
          { status: 400 }
        );
      }

      const { data: entry } = await supabase
        .from("tt_time_entries")
        .select("*")
        .eq("id", entry_id)
        .eq("user_id", user.id)
        .single();

      if (!entry) {
        return NextResponse.json({ error: "Timer entry not found" }, { status: 404 });
      }

      if (entry.end_time) {
        return NextResponse.json(
          { error: "This timer has already been clocked out" },
          { status: 400 }
        );
      }

      if (!entry.start_time) {
        return NextResponse.json(
          { error: "This entry has no start time" },
          { status: 400 }
        );
      }

      const now = new Date();
      const startTime = new Date(entry.start_time);
      const diffMs = now.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const roundedHours = roundToQuarter(diffHours);

      const updates: Record<string, unknown> = {
        end_time: now.toISOString(),
        hours: Math.max(roundedHours, 0.25), // Minimum 0.25 hours
      };

      if (notes !== undefined) {
        updates.notes = notes;
      }

      const { data, error } = await supabase
        .from("tt_time_entries")
        .update(updates)
        .eq("id", entry_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    if (action === "active") {
      const { data: activeEntry } = await supabase
        .from("tt_time_entries")
        .select("*, tt_projects(name, client)")
        .eq("user_id", user.id)
        .not("start_time", "is", null)
        .is("end_time", null)
        .single();

      return NextResponse.json({ active_timer: activeEntry || null });
    }

    return NextResponse.json(
      { error: "Invalid action. Use clock_in, clock_out, or active" },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/time-tracker/timer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
