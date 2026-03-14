import { NextResponse } from "next/server";
import type { StoryPayload } from "@/reference/storyBuddyUtils";

const ANTHROPIC_VERSION = "2023-06-01";

/** Keep last N chars of story context to limit input tokens (and cost) on long games. */
const MAX_STORY_CONTEXT_CHARS = 3000;

const SYSTEM_PROMPT_BASE = `You are Story Buddy. Co-write a short story with the user (Exposition → Rising Action → Climax → Falling Action → Resolution).

Respond with a single JSON object only (no markdown). Keys:
- story_so_far: string[] (full story so far as an ordered list of short beats; each element is one or two short sentences with no embedded newlines)
- choices: string[] (exactly 3 short options; when ending, use either empty [] or a single choice like "The End")
- allow_custom_input: boolean (true)
When finished add: final_title, final_story (complete story).

After the climax, move into a brief resolution (one or two beats). Do not introduce new plot threads or a new adventure after the climax.
As soon as the resolution is told, the agent MUST set final_title and final_story (the full story including the resolution) and stop offering new branches: use either empty choices or a single choice labeled something like "The End". No further choices after that.
Never add new plot threads after the resolution. One resolution, then end.

First turn: brief exposition + 3 choices. Always valid JSON.`;

/** Default prompt when there are choices; subtle and short. */
const DEFAULT_MESSAGE_TO_PLAYER = "Pick one or write your own:";

const PLAYER_MESSENGER_SYSTEM_PROMPT = `You are Story Buddy Messenger. The story has just ended (no more choices).

Respond with a single JSON object only (no markdown). Keys:
- message_to_player: string (one very short phrase, under 10 words).

Guidelines:
- Subtle and minimal. Examples: "The end." "Thanks for playing." "Hope you enjoyed the story."
- Do not recap the plot, themes, or character arcs. No "The choice is yours" or similar.`;

const FINAL_STORY_WRITER_SYSTEM_PROMPT = `You are Story Buddy's final-story writer.

You will receive a story as a list of short beats (one or two sentences each). Your job is to turn them into a single, readable short story.

Respond with a single JSON object only (no markdown). Keys:
- final_title: string (a short, evocative title for the story)
- final_story: string (the complete story as continuous prose)

Guidelines for final_story:
- Write in full paragraphs. Use paragraph breaks (\\n\\n) between logical sections.
- Keep the same events and tone; improve flow, punctuation, and wording.
- Do not add new plot points or change the ending.`;

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
    if (parsed != null && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (
        "story_so_far" in obj ||
        "message_to_player" in obj ||
        "final_story" in obj ||
        "final_title" in obj ||
        Array.isArray((obj as StoryPayload).choices)
      ) {
        return parsed as StoryPayload;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function parseMessengerMessage(text: string): string | null {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json) as unknown;
    if (parsed != null && typeof parsed === "object" && "message_to_player" in (parsed as object)) {
      const msg = (parsed as { message_to_player?: unknown }).message_to_player;
      if (typeof msg === "string") {
        const trimmed = msg.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

type FinalStoryResult = { final_title: string; final_story: string };

function parseFinalStoryPayload(text: string): FinalStoryResult | null {
  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json) as unknown;
    if (parsed != null && typeof parsed === "object") {
      const obj = parsed as { final_title?: unknown; final_story?: unknown };
      const title = typeof obj.final_title === "string" ? obj.final_title.trim() : "";
      const story = typeof obj.final_story === "string" ? obj.final_story.trim() : "";
      if (story.length > 0) {
        return {
          final_title: title.length > 0 ? title : "The End",
          final_story: story,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getFullStoryText(payload: StoryPayload): string {
  const raw = payload.story_so_far;
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s ?? "").trim()).filter(Boolean).join("\n");
  }
  if (typeof raw === "string") return raw;
  return "";
}

/** True when there are no real next moves: no choices or only an ending choice like "The End". */
function isStoryEnded(choices: string[]): boolean {
  if (choices.length === 0) return true;
  if (choices.length === 1) {
    const c = choices[0].toLowerCase().trim();
    return c === "the end" || c === "end" || /^the end\.?$/i.test(c);
  }
  return false;
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
    // First call: generate story_so_far, choices, and any final_* fields.
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

    const choices =
      Array.isArray(payload.choices) && payload.choices.length > 0
        ? payload.choices.filter(
            (c): c is string => typeof c === "string" && c.trim().length > 0
          )
        : [];

    const storyEnded = isStoryEnded(choices);
    let messageToPlayer: string;

    if (!storyEnded) {
      messageToPlayer = DEFAULT_MESSAGE_TO_PLAYER;
    } else {
      // Story ended: one short LLM call for a minimal closing line.
      const messengerRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 64,
          cache_control: { type: "ephemeral" },
          system: PLAYER_MESSENGER_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content:
                "The story has ended. Respond with JSON: {\"message_to_player\": \"one short phrase\"}.",
            },
          ],
        }),
      });

      const messengerData = (await messengerRes.json()) as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message?: string };
      };

      if (!messengerRes.ok) {
        const errMsg =
          messengerData.error?.message ?? `HTTP ${messengerRes.status}`;
        return NextResponse.json({ error: errMsg }, { status: 502 });
      }

      const messengerTextBlock = messengerData.content?.find(
        (b) => b.type === "text"
      );
      const messengerText = messengerTextBlock?.text ?? "";
      const parsed = parseMessengerMessage(messengerText);
      if (!parsed) {
        return NextResponse.json(
          {
            error: "Could not parse message_to_player from messenger response",
            raw: messengerText.slice(0, 500),
          },
          { status: 502 }
        );
      }
      messageToPlayer = parsed;
    }

    // When story ended, ensure we have a proper final_story (continuous prose) if the model didn't provide one.
    let finalTitle = payload.final_title != null ? String(payload.final_title).trim() : "";
    let finalStory = payload.final_story != null ? String(payload.final_story).trim() : "";
    const needsFinalStory = storyEnded && (finalStory.length === 0 || finalTitle.length === 0);
    const fullStoryBeats = getFullStoryText(payload);

    if (needsFinalStory && fullStoryBeats.length > 0) {
      const writerRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          cache_control: { type: "ephemeral" },
          system: FINAL_STORY_WRITER_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Story beats:\n\n${fullStoryBeats}\n\nReturn JSON with final_title and final_story (full prose, with paragraph breaks).`,
            },
          ],
        }),
      });

      const writerData = (await writerRes.json()) as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message?: string };
      };

      if (writerRes.ok) {
        const writerTextBlock = writerData.content?.find((b) => b.type === "text");
        const writerText = writerTextBlock?.text ?? "";
        const written = parseFinalStoryPayload(writerText);
        if (written) {
          finalStory = written.final_story;
          if (finalTitle.length === 0) finalTitle = written.final_title;
        }
      }
    }

    const finalPayload: StoryPayload = {
      ...payload,
      message_to_player: messageToPlayer,
      ...(finalTitle.length > 0 ? { final_title: finalTitle } : {}),
      ...(finalStory.length > 0 ? { final_story: finalStory } : {}),
    };

    return NextResponse.json({ payload: finalPayload });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Anthropic API request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
