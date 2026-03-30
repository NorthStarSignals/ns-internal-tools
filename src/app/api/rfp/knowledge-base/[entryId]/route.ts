import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const body = await request.json();

    const allowedFields = [
      "requirement_text",
      "response_text",
      "requirement_type",
      "industry",
      "win_status",
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_knowledge_base")
      .update(updates)
      .eq("entry_id", entryId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Entry not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/knowledge-base/[entryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const supabase = createServerSupabase();

    const { error } = await supabase
      .from("rfp_knowledge_base")
      .delete()
      .eq("entry_id", entryId)
      .eq("clerk_user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/rfp/knowledge-base/[entryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
