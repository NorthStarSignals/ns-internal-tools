import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_company_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .eq("clerk_user_id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/rfp/profiles/[profileId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    const body = await request.json();

    const allowedFields = [
      "company_name",
      "industry",
      "description",
      "capabilities",
      "certifications",
      "past_performance",
      "key_personnel",
      "boilerplate",
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_company_profiles")
      .update(updates)
      .eq("profile_id", profileId)
      .eq("clerk_user_id", userId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Profile not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/rfp/profiles/[profileId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profileId } = await params;
    const supabase = createServerSupabase();

    // Unlink any projects using this profile
    await supabase
      .from("rfp_projects")
      .update({ profile_id: null })
      .eq("profile_id", profileId)
      .eq("clerk_user_id", userId);

    const { error } = await supabase
      .from("rfp_company_profiles")
      .delete()
      .eq("profile_id", profileId)
      .eq("clerk_user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/rfp/profiles/[profileId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
