import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "sk-ant-...") {
      return NextResponse.json({ status: "error", message: "API key not configured" }, { status: 500 });
    }

    return NextResponse.json({ status: "connected" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
