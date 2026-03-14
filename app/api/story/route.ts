import { NextResponse } from "next/server";
import type { StoryPayload } from "@/reference/storyBuddyUtils";

const ANTHROPIC_VERSION = "2023-06-01";

/** Keep last N chars of story context to limit input tokens (and cost) on long games. */
const MAX_STORY_CONTEXT_CHARS = 3000;

const SYSTEM_PROMPT_BASE = `You are Story Buddy. Co-write a short story with the user (Exposition → Rising Action → Climax → Falling Action → Resolution).

Respond with a single JSON object only (no markdown). Keys:
- story_so_far: string[] (full story so far as an ordered list of short beats; each element is one or two short sentences with no embedded newlines)
- message_to_player: string (one or two sentences)
- choices: string[] (exactly 3 short options; when ending, use either empty [] or a single choice like "The End")
- allow_custom_input: boolean (true)
When finished add: final_title, final_story (complete story).

After the climax, move into a brief resolution (one or two beats). Do not introduce new plot threads or a new adventure after the climax.
As soon as the resolution is told, the agent MUST set final_title and final_story (the full story including the resolution) and stop offering new branches: use either empty choices or a single choice labeled something like "The End". No further choices after that.
Never add new plot threads after the resolution. One resolution, then end.

First turn: brief exposition + 3 choices. Always valid JSON.`;

function buildSystemPrompt(opts: {
  shortSentencesOnly?: boolean;
  shortSentenceMinWords?: number;
  shortSentenceMaxWords?: number;
  usePlayerWordsWhenPossible?: boolean;
}): string {
  let prompt = SYSTEM_PROMPT_BASE;
  if (opts.shortSentencesOnly) {
    const minRaw = opts.shortSentenceMinWords ?? 8;
    const maxRaw = opts.shortSentenceMaxWords ?? 18;
    const minWords = Math.max(5, Math.min(25, Math.round(minRaw)));
    const maxWords = Math.max(5, Math.min(25, Math.round(maxRaw)));
    const finalMin = Math.min(minWords, maxWords);
    const finalMax = Math.max(minWords, maxWords);
    prompt += `\n\nSentences must be between ${finalMin} and ${finalMax} words`;
  }
  if (opts.usePlayerWordsWhenPossible) {
    prompt +=
      "\n\nWhen the player chooses an option or types their own action, reflect their words in the story when possible (within safety and coherence).";
  }
  return prompt;
}

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

  let body: {
    action: string;
    choice?: string;
    storySoFar?: string;
    messageToPlayer?: string;
    options?: {
      shortSentencesOnly?: boolean;
      shortSentenceMinWords?: number;
      shortSentenceMaxWords?: number;
      usePlayerWordsWhenPossible?: boolean;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const action = body.action === "choice" ? "choice" : "start";
  const storySoFar = (body.storySoFar ?? "").slice(-MAX_STORY_CONTEXT_CHARS);
  const userContent =
    action === "start"
      ? "Start the story. Return only the JSON object for the first turn."
      : `The player chose: "${body.choice ?? ""}". Current story_so_far:\n${storySoFar}\n\nCurrent message_to_player was: ${body.messageToPlayer ?? ""}\n\nReturn the next turn as a single JSON object only.`;

  const options = body.options ?? {};
  const systemPrompt = buildSystemPrompt({
    shortSentencesOnly: options.shortSentencesOnly === true,
    shortSentenceMinWords: options.shortSentenceMinWords,
    shortSentenceMaxWords: options.shortSentenceMaxWords,
    usePlayerWordsWhenPossible: options.usePlayerWordsWhenPossible === true,
  });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        cache_control: { type: "ephemeral" },
        system: systemPrompt,
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
