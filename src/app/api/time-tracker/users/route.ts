import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/time-tracker";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(userId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const supabase = createServerSupabase();

    const { data: users, error } = await supabase
      .from("tt_users")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/time-tracker/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: admin, error: adminError } = await requireAdmin(userId);
    if (adminError) {
      return NextResponse.json({ error: adminError }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, pay_type, hourly_rate, retainer_amount } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    if (pay_type && !["hourly", "retainer", "milestone"].includes(pay_type)) {
      return NextResponse.json(
        { error: "pay_type must be hourly, retainer, or milestone" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("tt_users")
      .insert({
        name,
        email,
        role: "member",
        pay_type: pay_type || "hourly",
        hourly_rate: hourly_rate || null,
        retainer_amount: retainer_amount || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/time-tracker/users error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
