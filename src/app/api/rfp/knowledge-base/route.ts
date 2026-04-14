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
    const query = searchParams.get("query");

    const supabase = createServerSupabase();

    let dbQuery = supabase
      .from("rfp_knowledge_base")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("times_used", { ascending: false });

    if (query) {
      // Search by text match in requirement or response text
      dbQuery = dbQuery.or(
        `requirement_text.ilike.%${query}%,response_text.ilike.%${query}%`
      );
    }

    const { data, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data });
  } catch (err) {
    console.error("GET /api/rfp/knowledge-base error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      requirement_text,
      response_text,
      requirement_type,
      industry,
      win_status,
      source_project_id,
    } = body;

    if (!requirement_text || !response_text) {
      return NextResponse.json(
        { error: "requirement_text and response_text are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_knowledge_base")
      .insert({
        clerk_user_id: userId,
        requirement_text,
        response_text,
        requirement_type: requirement_type || null,
        industry: industry || null,
        win_status: win_status || null,
        source_project_id: source_project_id || null,
        times_used: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/rfp/knowledge-base error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
