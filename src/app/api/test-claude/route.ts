import { NextResponse } from "next/server";
import { askClaudeJSON } from "@/lib/claude";

export const maxDuration = 60;

export async function GET() {
  try {
    const start = Date.now();
    const result = await askClaudeJSON<{ greeting: string }>(
      "Return a JSON object with a single key 'greeting' containing a short greeting.",
      "Say hello!",
      { maxTokens: 100 }
    );
    const elapsed = Date.now() - start;
    return NextResponse.json({ ok: true, result, elapsed_ms: elapsed });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.substring(0, 500) : undefined,
    }, { status: 500 });
  }
}
