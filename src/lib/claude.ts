import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const claude = getClaudeClient();
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type === "text") return block.text;
  return "";
}

export async function askClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number }
): Promise<T> {
  const text = await askClaude(
    systemPrompt + "\n\nRespond with valid JSON only. No markdown, no code fences.",
    userMessage,
    options
  );

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}
