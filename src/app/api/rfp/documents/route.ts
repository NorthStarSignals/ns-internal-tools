import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get("project_id");
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
      .from("rfp_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (err) {
    console.error("GET /api/rfp/documents error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
