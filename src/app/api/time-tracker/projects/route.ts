import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser, requireAdmin } from "@/lib/time-tracker";

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
    const activeOnly = request.nextUrl.searchParams.get("active_only");

    let query = supabase
      .from("tt_projects")
      .select("*")
      .order("name", { ascending: true });

    if (activeOnly === "true") {
      query = query.eq("status", "active");
    }

    const { data: projects, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/time-tracker/projects error:", err);
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
    const { name, client } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("tt_projects")
      .insert({
        name,
        client: client || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/time-tracker/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
