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

    const { data, error } = await supabase
      .from("rfp_company_profiles")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: data });
  } catch (err) {
    console.error("GET /api/rfp/profiles error:", err);
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
      company_name,
      industry,
      description,
      capabilities,
      certifications,
      past_performance,
      key_personnel,
      boilerplate,
    } = body;

    if (!company_name) {
      return NextResponse.json({ error: "company_name is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("rfp_company_profiles")
      .insert({
        clerk_user_id: userId,
        company_name,
        industry: industry || null,
        description: description || null,
        capabilities: capabilities || [],
        certifications: certifications || [],
        past_performance: past_performance || [],
        key_personnel: key_personnel || [],
        boilerplate: boilerplate || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/rfp/profiles error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
