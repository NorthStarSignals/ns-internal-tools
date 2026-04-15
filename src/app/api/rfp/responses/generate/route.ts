import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { askClaude } from "@/lib/claude";
import { RESPONSE_GENERATION_PROMPT } from "@/lib/claude-prompts";

export const maxDuration = 60;
import { RfpRequirement, CompanyProfile, KnowledgeBaseEntry } from "@/lib/types";

function getRelevantKBEntries(
  requirement: RfpRequirement,
  kbEntries: KnowledgeBaseEntry[],
  limit: number = 3
): KnowledgeBaseEntry[] {
  const reqWords = new Set(
    requirement.requirement_text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const scored = kbEntries.map((entry) => {
    const entryWords = new Set(
      `${entry.requirement_text} ${entry.response_text}`
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    let overlap = 0;
    reqWords.forEach((word) => {
      if (entryWords.has(word)) overlap++;
    });

    const typeBonus = entry.requirement_type === requirement.requirement_type ? 2 : 0;
    const winBonus = entry.win_status === "won" ? 1 : 0;

    return { entry, score: overlap + typeBonus + winBonus };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

function buildPromptForRequirement(
  requirement: RfpRequirement,
  profile: CompanyProfile | null,
  kbEntries: KnowledgeBaseEntry[],
  contractType: string | null
): string {
  const parts: string[] = [];

  parts.push(`## Requirement\n${requirement.requirement_text}`);

  if (requirement.requirement_type) {
    parts.push(`**Type:** ${requirement.requirement_type}`);
  }
  if (requirement.word_limit) {
    parts.push(`**Word Limit:** ${requirement.word_limit}`);
  }
  if (contractType) {
    parts.push(`**Contract Type:** ${contractType}`);
  }

  if (profile) {
    parts.push(`\n## Company Profile`);
    parts.push(`**Company:** ${profile.company_name}`);
    if (profile.description) {
      parts.push(`**Description:** ${profile.description}`);
    }
    if (profile.capabilities.length > 0) {
      parts.push(`**Capabilities:** ${profile.capabilities.join(", ")}`);
    }
    if (profile.certifications.length > 0) {
      parts.push(`**Certifications:** ${profile.certifications.join(", ")}`);
    }
    if (profile.past_performance.length > 0) {
      parts.push(`\n**Past Performance:**`);
      for (const pp of profile.past_performance) {
        parts.push(`- ${pp.project_name} (${pp.client}, ${pp.value}): ${pp.description}`);
      }
    }
    if (profile.key_personnel.length > 0) {
      parts.push(`\n**Key Personnel:**`);
      for (const kp of profile.key_personnel) {
        parts.push(`- ${kp.name}, ${kp.title}: ${kp.bio}`);
      }
    }
  }

  if (kbEntries.length > 0) {
    parts.push(`\n## Relevant Past Responses (Knowledge Base)`);
    for (let i = 0; i < kbEntries.length; i++) {
      const kb = kbEntries[i];
      parts.push(
        `\n### Reference ${i + 1}${kb.win_status === "won" ? " (from winning proposal)" : ""}` +
          `\n**Question:** ${kb.requirement_text}\n**Response:** ${kb.response_text}`
      );
    }
  }

  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, requirement_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    if (!requirement_id) {
      return NextResponse.json({ error: "requirement_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Fetch project and verify ownership
    const { data: project } = await supabase
      .from("rfp_projects")
      .select("*")
      .eq("project_id", project_id)
      .eq("clerk_user_id", userId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch the specific requirement
    const { data: requirement, error: reqError } = await supabase
      .from("rfp_requirements")
      .select("*")
      .eq("requirement_id", requirement_id)
      .eq("project_id", project_id)
      .single();

    if (reqError || !requirement) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    // Check if a response already exists — delete it for regeneration
    const { data: existing } = await supabase
      .from("rfp_responses")
      .select("response_id")
      .eq("requirement_id", requirement_id)
      .eq("project_id", project_id)
      .single();

    if (existing) {
      await supabase.from("rfp_responses").delete().eq("response_id", existing.response_id);
    }

    // Fetch company profile if set
    let profile: CompanyProfile | null = null;
    if (project.profile_id) {
      const { data: profileData } = await supabase
        .from("rfp_company_profiles")
        .select("*")
        .eq("profile_id", project.profile_id)
        .single();
      profile = profileData;
    }

    // Fetch knowledge base entries for this user
    const { data: kbEntries } = await supabase
      .from("rfp_knowledge_base")
      .select("*")
      .eq("clerk_user_id", userId);

    const allKB: KnowledgeBaseEntry[] = kbEntries || [];
    const relevantKB = getRelevantKBEntries(requirement, allKB);
    const userMessage = buildPromptForRequirement(
      requirement,
      profile,
      relevantKB,
      project.contract_type
    );

    const draftText = await askClaude(RESPONSE_GENERATION_PROMPT, userMessage, {
      maxTokens: 4096,
      temperature: 0.3,
    });

    const kbSourceId = relevantKB.length > 0 ? relevantKB[0].entry_id : null;

    // Update times_used for KB entries that were referenced
    if (relevantKB.length > 0) {
      for (const kb of relevantKB) {
        await supabase
          .from("rfp_knowledge_base")
          .update({ times_used: (kb.times_used || 0) + 1 })
          .eq("entry_id", kb.entry_id);
      }
    }

    const { data: response, error: insertError } = await supabase
      .from("rfp_responses")
      .insert({
        requirement_id,
        project_id,
        draft_text: draftText,
        status: "draft",
        ai_confidence: relevantKB.length > 0 ? 0.8 : 0.6,
        kb_source_id: kbSourceId,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ response });
  } catch (err) {
    console.error("POST /api/rfp/responses/generate error:", err);
    return NextResponse.json({
      error: "Internal server error",
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
