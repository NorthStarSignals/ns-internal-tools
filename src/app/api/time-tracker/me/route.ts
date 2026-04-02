import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTTUserOrLink } from "@/lib/time-tracker";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getTTUserOrLink(userId);

    if (!user) {
      return NextResponse.json(
        { error: "No time tracker profile found for this account" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/time-tracker/me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
