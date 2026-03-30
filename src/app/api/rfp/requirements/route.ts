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
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify project ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("rfp_requirements")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/rfp/requirements error:", err);
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
    const { project_id, section, requirement_text, requirement_type, word_limit, page_number } = body;

    if (!project_id || !requirement_text) {
      return NextResponse.json(
        { error: "project_id and requirement_text are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Verify project ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get max sort_order for this project
    const { data: maxSort } = await supabase
      .from("rfp_requirements")
      .select("sort_order")
      .eq("project_id", project_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxSort?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("rfp_requirements")
      .insert({
        project_id,
        section: section || null,
        requirement_text,
        requirement_type: requirement_type || "narrative",
        word_limit: word_limit || null,
        page_number: page_number || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/rfp/requirements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requirement_id, ...updates } = body;

    if (!requirement_id) {
      return NextResponse.json({ error: "requirement_id is required" }, { status: 400 });
    }

    const allowedFields = [
      "section",
      "requirement_text",
      "requirement_type",
      "word_limit",
      "page_number",
      "sort_order",
    ];
    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify ownership via project
    const { data: req } = await supabase
      .from("rfp_requirements")
      .select("project_id")
      .eq("requirement_id", requirement_id)
      .single();

    if (!req) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", req.project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("rfp_requirements")
      .update(filteredUpdates)
      .eq("requirement_id", requirement_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/requirements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get("requirement_id");

    if (!requirementId) {
      return NextResponse.json({ error: "requirement_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Verify ownership via project
    const { data: req } = await supabase
      .from("rfp_requirements")
      .select("project_id")
      .eq("requirement_id", requirementId)
      .single();

    if (!req) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("rfp_projects")
      .select("project_id")
      .eq("project_id", req.project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete associated responses first
    await supabase.from("rfp_responses").delete().eq("requirement_id", requirementId);

    const { error } = await supabase
      .from("rfp_requirements")
      .delete()
      .eq("requirement_id", requirementId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/rfp/requirements error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
