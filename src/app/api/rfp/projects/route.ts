import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerSupabase();

    const { data: projects, error } = await supabase
      .from("rfp_projects")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch counts for each project
    const projectIds = projects.map((p: { project_id: string }) => p.project_id);

    if (projectIds.length === 0) {
      return NextResponse.json({ projects });
    }

    const { data: reqCounts } = await supabase
      .from("rfp_requirements")
      .select("project_id")
      .in("project_id", projectIds);

    const { data: resCounts } = await supabase
      .from("rfp_responses")
      .select("project_id, status")
      .in("project_id", projectIds);

    const reqCountMap: Record<string, number> = {};
    const resCountMap: Record<string, number> = {};
    const approvedCountMap: Record<string, number> = {};

    for (const r of reqCounts || []) {
      reqCountMap[r.project_id] = (reqCountMap[r.project_id] || 0) + 1;
    }
    for (const r of resCounts || []) {
      resCountMap[r.project_id] = (resCountMap[r.project_id] || 0) + 1;
      if (r.status === "approved") {
        approvedCountMap[r.project_id] = (approvedCountMap[r.project_id] || 0) + 1;
      }
    }

    const enriched = projects.map((p: { project_id: string }) => ({
      ...p,
      requirement_count: reqCountMap[p.project_id] || 0,
      response_count: resCountMap[p.project_id] || 0,
      approved_count: approvedCountMap[p.project_id] || 0,
    }));

    return NextResponse.json({ projects: enriched });
  } catch (err) {
    console.error("GET /api/rfp/projects error:", err);
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
    const { name, client_name, industry, contract_type, due_date, profile_id } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_projects")
      .insert({
        clerk_user_id: userId,
        name,
        client_name: client_name || null,
        industry: industry || null,
        contract_type: contract_type || null,
        due_date: due_date || null,
        profile_id: profile_id || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/rfp/projects error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
