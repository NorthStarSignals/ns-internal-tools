import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify project ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("rfp_responses")
      .select("*, requirement:rfp_requirements(*)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/rfp/responses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { response_id, draft_text, edited_text, status } = body;

    if (!response_id) {
      return NextResponse.json({ error: "response_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify ownership via project
    const { data: resp } = await supabase
      .from("rfp_responses")
      .select("project_id")
      .eq("response_id", response_id)
      .single();

    if (!resp) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", resp.project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (draft_text !== undefined) updates.draft_text = draft_text;
    if (edited_text !== undefined) {
      updates.edited_text = edited_text;
      updates.edited_by = userId;
      updates.edited_at = new Date().toISOString();
    }
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rfp_responses")
      .update(updates)
      .eq("response_id", response_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/responses error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
