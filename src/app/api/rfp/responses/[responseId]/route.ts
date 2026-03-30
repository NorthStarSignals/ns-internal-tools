import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { responseId } = await params;
    const body = await request.json();
    const supabase = createServerSupabase();

    // Verify ownership via project
    const { data: resp } = await supabase
      .from("rfp_responses")
      .select("project_id")
      .eq("response_id", responseId)
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

    const allowedFields = ["draft_text", "edited_text", "status", "ai_confidence"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (body.edited_text !== undefined) {
      updates.edited_by = userId;
      updates.edited_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rfp_responses")
      .update(updates)
      .eq("response_id", responseId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/responses/[responseId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { responseId } = await params;
    const supabase = createServerSupabase();

    // Verify ownership via project
    const { data: resp } = await supabase
      .from("rfp_responses")
      .select("project_id")
      .eq("response_id", responseId)
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

    const { error } = await supabase
      .from("rfp_responses")
      .delete()
      .eq("response_id", responseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/rfp/responses/[responseId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
