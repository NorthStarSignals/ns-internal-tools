import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser, requireAdmin } from "@/lib/time-tracker";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: targetUserId } = await params;
    const supabase = createServerSupabase();

    const { data: user, error } = await supabase
      .from("tt_users")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data: entries } = await supabase
      .from("tt_time_entries")
      .select("hours, status")
      .eq("user_id", targetUserId)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const totalHours = (entries || []).reduce(
      (sum: number, e: { hours: number }) => sum + (e.hours || 0),
      0
    );

    let totalPay: number | null = null;
    if (user.pay_type === "hourly") {
      totalPay = totalHours * (user.hourly_rate || 0);
    } else if (user.pay_type === "retainer") {
      totalPay = user.retainer_amount || 0;
    }

    return NextResponse.json({
      ...user,
      stats: {
        total_hours_this_month: totalHours,
        total_pay_this_month: totalPay,
      },
    });
  } catch (err) {
    console.error("GET /api/time-tracker/users/[userId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(clerkUserId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const { userId: targetUserId } = await params;
    const body = await request.json();

    const allowedFields = [
      "name",
      "email",
      "role",
      "pay_type",
      "hourly_rate",
      "retainer_amount",
      "status",
    ];
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
      .from("tt_users")
      .update(updates)
      .eq("id", targetUserId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/time-tracker/users/[userId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(clerkUserId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const { userId: targetUserId } = await params;

    // Safety rail: admins can't delete themselves. Would lock them out of
    // the tool with no way to reinstate without going directly to the DB.
    if (admin.id === targetUserId) {
      return NextResponse.json(
        { error: "You can't delete your own account." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Fetch first so we can return the deleted row's details (for the toast).
    // tt_time_entries.user_id has ON DELETE CASCADE so their time history
    // gets wiped automatically.
    const { data: existing } = await supabase
      .from("tt_users")
      .select("id, name, email")
      .eq("id", targetUserId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("tt_users")
      .delete()
      .eq("id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "User permanently deleted",
      deleted: existing,
    });
  } catch (err) {
    console.error("DELETE /api/time-tracker/users/[userId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
