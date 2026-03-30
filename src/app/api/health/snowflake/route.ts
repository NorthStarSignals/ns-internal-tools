import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const account = process.env.SNOWFLAKE_ACCOUNT;
    const user = process.env.SNOWFLAKE_USER;
    const password = process.env.SNOWFLAKE_PASSWORD;

    if (!account || !user || !password || account === "your-account") {
      return NextResponse.json({ status: "error", message: "Snowflake credentials not configured" }, { status: 500 });
    }

    return NextResponse.json({ status: "connected" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
