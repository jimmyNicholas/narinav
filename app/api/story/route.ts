import { NextResponse } from "next/server";
import type { StoryPayload } from "@/reference/storyBuddyUtils";

const ANTHROPIC_VERSION = "2023-06-01";

const SYSTEM_PROMPT = `You are Story Buddy, a collaborative story-building assistant. You co-write a short story with the user through five stages: Exposition → Rising Action → Climax → Falling Action → Resolution.

You must respond with a single JSON object only (no markdown, no code fence, no other text). The object must have these keys:
- story_so_far: string — the full story text so far, one paragraph per line.
- message_to_player: string — what you say to the player this turn (one or two sentences).
- choices: string[] — exactly 3 options for what happens next (short phrases).
- allow_custom_input: boolean — true so the player can type their own option.
When the story is finished (Resolution done), also include:
- final_title: string — a title for the story.
- final_story: string — the complete polished story.

If this is the first turn (action is "start"), begin the story with a brief exposition and offer 3 choices. Always return valid JSON.`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(trimmed);
  if (codeBlock) return codeBlock[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function parsePayload(text: string): StoryPayload | null {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json) as unknown;
    if (parsed != null && typeof parsed === "object" && "message_to_player" in (parsed as object)) {
      return parsed as StoryPayload;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set" },
      { status: 500 }
    );
  }

  let body: { action: string; choice?: string; storySoFar?: string; messageToPlayer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const action = body.action === "choice" ? "choice" : "start";
  const userContent =
    action === "start"
      ? "Start the story. Return only the JSON object for the first turn."
      : `The player chose: "${body.choice ?? ""}". Current story_so_far:\n${body.storySoFar ?? ""}\n\nCurrent message_to_player was: ${body.messageToPlayer ?? ""}\n\nReturn the next turn as a single JSON object only.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const errMsg = data.error?.message ?? `HTTP ${res.status}`;
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const textBlock = data.content?.find((b) => b.type === "text");
    const text = textBlock?.text ?? "";
    const payload = parsePayload(text);

    if (!payload) {
      return NextResponse.json(
        { error: "Could not parse story payload from response", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({ payload });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anthropic API request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
