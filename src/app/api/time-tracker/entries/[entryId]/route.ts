import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabase } from "@/lib/supabase";
import { getTTUser } from "@/lib/time-tracker";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
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

    const { entryId } = await params;
    const supabase = createServerSupabase();

    const { data: entry, error } = await supabase
      .from("tt_time_entries")
      .select("*, tt_users(name, email), tt_projects(name, client)")
      .eq("id", entryId)
      .single();

    if (error || !entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Members can only see their own entries
    if (user.role === "member" && entry.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (err) {
    console.error("GET /api/time-tracker/entries/[entryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
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

    const { entryId } = await params;
    const supabase = createServerSupabase();

    // Fetch the entry first
    const { data: entry } = await supabase
      .from("tt_time_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Only editable if draft and owned by user, or if admin
    const isOwner = entry.user_id === user.id;
    const isAdmin = user.role === "admin";

    if (!isAdmin && (!isOwner || entry.status !== "draft")) {
      return NextResponse.json(
        { error: "Can only edit your own draft entries" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedFields = ["project_id", "date", "hours", "notes"];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (updates.hours !== undefined) {
      const hours = updates.hours as number;
      if (hours < 0.25 || hours > 24) {
        return NextResponse.json(
          { error: "hours must be between 0.25 and 24" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tt_time_entries")
      .update(updates)
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/time-tracker/entries/[entryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
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

    const { entryId } = await params;
    const supabase = createServerSupabase();

    // Fetch the entry first
    const { data: entry } = await supabase
      .from("tt_time_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Only deletable if draft and owned by user, or if admin
    const isOwner = entry.user_id === user.id;
    const isAdmin = user.role === "admin";

    if (!isAdmin && (!isOwner || entry.status !== "draft")) {
      return NextResponse.json(
        { error: "Can only delete your own draft entries" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("tt_time_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Entry deleted" });
  } catch (err) {
    console.error("DELETE /api/time-tracker/entries/[entryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
