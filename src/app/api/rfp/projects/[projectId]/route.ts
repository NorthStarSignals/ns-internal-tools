import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_projects")
      .select("*")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch counts
    const [{ count: requirement_count }, { count: response_count }, { count: approved_count }] =
      await Promise.all([
        supabase
          .from("rfp_requirements")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("rfp_responses")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("rfp_responses")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "approved"),
      ]);

    return NextResponse.json({
      project: {
        ...data,
        requirement_count: requirement_count || 0,
        response_count: response_count || 0,
        approved_count: approved_count || 0,
      },
    });
  } catch (err) {
    console.error("GET /api/rfp/projects/[projectId] error:", err);
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

    const { projectId } = await params;
    const body = await request.json();
    const allowedFields = ["name", "client_name", "due_date", "status", "profile_id", "industry", "contract_type"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_projects")
      .update(updates)
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Project not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/projects/[projectId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const supabase = createServerSupabase();

    // Verify ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete related records in order
    await supabase.from("rfp_responses").delete().eq("project_id", projectId);
    await supabase.from("rfp_requirements").delete().eq("project_id", projectId);
    await supabase.from("rfp_documents").delete().eq("project_id", projectId);

    const { error } = await supabase
      .from("rfp_projects")
      .delete()
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/rfp/projects/[projectId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
