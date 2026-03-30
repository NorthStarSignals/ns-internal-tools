import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dealId } = await params;
    const supabase = createServerSupabase();

    const { data: deal, error } = await supabase
      .from("deals")
      .select("*")
      .eq("deal_id", dealId)
      .eq("clerk_user_id", userId)
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Fetch stats
    const [filesRes, flagsRes, financialsRes, legalsRes] = await Promise.all([
      supabase.from("data_room_files").select("file_id, document_category, processing_status").eq("deal_id", dealId),
      supabase.from("red_flags").select("flag_id, severity").eq("deal_id", dealId).eq("is_dismissed", false),
      supabase.from("financial_extracts").select("extract_id").eq("deal_id", dealId),
      supabase.from("legal_extracts").select("extract_id").eq("deal_id", dealId),
    ]);

    const files = filesRes.data || [];
    const flags = flagsRes.data || [];

    return NextResponse.json({
      ...deal,
      file_count: files.length,
      files_completed: files.filter((f) => f.processing_status === "completed").length,
      files_by_category: files.reduce((acc: Record<string, number>, f) => {
        const cat = f.document_category || "unclassified";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {}),
      critical_count: flags.filter((f) => f.severity === "critical").length,
      warning_count: flags.filter((f) => f.severity === "warning").length,
      note_count: flags.filter((f) => f.severity === "note").length,
      financial_extract_count: (financialsRes.data || []).length,
      legal_extract_count: (legalsRes.data || []).length,
    });
  } catch (err) {
    console.error("GET /api/deals/[dealId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dealId } = await params;
    const body = await request.json();

    const allowedFields = ["deal_name", "business_type", "asking_price", "client_name", "status"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("deals")
      .update(updates)
      .eq("deal_id", dealId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/deals/[dealId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dealId } = await params;
    const supabase = createServerSupabase();

    // Verify ownership
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", dealId)
      .eq("clerk_user_id", userId)
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Delete storage files
    const { data: files } = await supabase
      .from("data_room_files")
      .select("file_path")
      .eq("deal_id", dealId);

    if (files && files.length > 0) {
      const paths = files.map((f) => f.file_path);
      await supabase.storage.from("data-room-files").remove(paths);
    }

    // Delete related records (cascade should handle most, but be explicit)
    await supabase.from("red_flags").delete().eq("deal_id", dealId);
    await supabase.from("financial_extracts").delete().eq("deal_id", dealId);
    await supabase.from("legal_extracts").delete().eq("deal_id", dealId);
    await supabase.from("deal_benchmarks").delete().eq("deal_id", dealId);
    await supabase.from("data_room_files").delete().eq("deal_id", dealId);
    const { error } = await supabase.from("deals").delete().eq("deal_id", dealId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/deals/[dealId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
