import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser } from "@/lib/time-tracker";

export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;

    let query = supabase
      .from("tt_time_entries")
      .select("*, tt_users(name, email), tt_projects(name, client)")
      .order("date", { ascending: false });

    // Members can only see their own entries
    if (user.role === "member") {
      query = query.eq("user_id", user.id);
    } else {
      // Admin can filter by user_id
      const filterUserId = searchParams.get("user_id");
      if (filterUserId) {
        query = query.eq("user_id", filterUserId);
      }
    }

    const projectId = searchParams.get("project_id");
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }

    const dateTo = searchParams.get("date_to");
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const status = searchParams.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/time-tracker/entries error:", err);
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
    const { project_id, date, hours, notes } = body;

    if (!project_id || !date || hours === undefined) {
      return NextResponse.json(
        { error: "project_id, date, and hours are required" },
        { status: 400 }
      );
    }

    if (hours < 0.25 || hours > 24) {
      return NextResponse.json(
        { error: "hours must be between 0.25 and 24" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("tt_time_entries")
      .insert({
        user_id: user.id,
        project_id,
        date,
        hours,
        notes: notes || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/time-tracker/entries error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
