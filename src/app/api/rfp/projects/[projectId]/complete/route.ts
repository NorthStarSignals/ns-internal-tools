import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { outcome } = body; // "won" | "lost"

    if (!outcome || !["won", "lost"].includes(outcome)) {
      return NextResponse.json(
        { error: "outcome must be 'won' or 'lost'" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    // Verify ownership
    const { data: project, error: projError } = await supabase
      .from("rfp_projects")
      .select("*")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project status
    await supabase
      .from("rfp_projects")
      .update({ status: outcome, updated_at: new Date().toISOString() })
      .eq("project_id", projectId);

    // If won, save approved responses to knowledge base
    if (outcome === "won") {
      const { data: responses } = await supabase
        .from("rfp_responses")
        .select("*, requirement:rfp_requirements(*)")
        .eq("project_id", projectId)
        .eq("status", "approved");

      if (responses && responses.length > 0) {
        const kbEntries = responses.map(
          (r: {
            requirement: { requirement_text: string; requirement_type: string };
            edited_text: string | null;
            draft_text: string | null;
          }) => ({
            clerk_user_id: userId,
            requirement_text: r.requirement?.requirement_text || "",
            response_text: r.edited_text || r.draft_text || "",
            requirement_type: r.requirement?.requirement_type || null,
            industry: project.industry || null,
            win_status: "won" as const,
            source_project_id: projectId,
            times_used: 0,
          })
        );

        const { error: kbError } = await supabase
          .from("rfp_knowledge_base")
          .insert(kbEntries);

        if (kbError) {
          console.error("Failed to save to knowledge base:", kbError);
          // Don't fail the whole request for this
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: outcome,
      kb_entries_saved: outcome === "won" ? "approved responses saved to knowledge base" : null,
    });
  } catch (err) {
    console.error("POST /api/rfp/projects/[projectId]/complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
