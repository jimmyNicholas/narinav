/**
 * Thin wrapper for Anthropic Messages API. Used by story route only.
 */

const ANTHROPIC_VERSION = "2023-06-01";

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function createMessage(params: {
  apiKey: string;
  model: string;
  system: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const errMsg = data.error?.message ?? `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  const textBlock = data.content?.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(trimmed);
  if (codeBlock) return codeBlock[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
