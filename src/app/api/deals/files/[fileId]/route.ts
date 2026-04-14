import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;
    const body = await request.json();

    const supabase = createServerSupabase();

    // Verify file exists and user owns the deal
    const { data: file } = await supabase
      .from("data_room_files")
      .select("file_id, deal_id")
      .eq("file_id", fileId)
      .single();

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", file.deal_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allowedFields = ["document_category", "processing_status"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("data_room_files")
      .update(updates)
      .eq("file_id", fileId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ file: data });
  } catch (err) {
    console.error("PATCH /api/deals/files/[fileId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
