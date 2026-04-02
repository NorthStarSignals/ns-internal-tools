import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser, requireAdmin } from "@/lib/time-tracker";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
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

    const { projectId } = await params;
    const supabase = createServerSupabase();

    const { data: project, error } = await supabase
      .from("tt_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get total hours for this project
    const { data: entries } = await supabase
      .from("tt_time_entries")
      .select("hours")
      .eq("project_id", projectId);

    const totalHours = (entries || []).reduce(
      (sum: number, e: { hours: number }) => sum + (e.hours || 0),
      0
    );

    return NextResponse.json({ ...project, total_hours: totalHours });
  } catch (err) {
    console.error("GET /api/time-tracker/projects/[projectId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(userId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const { projectId } = await params;
    const body = await request.json();

    const allowedFields = ["name", "client", "status"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("tt_projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/time-tracker/projects/[projectId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
