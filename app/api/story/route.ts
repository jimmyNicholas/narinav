import { NextResponse } from "next/server";
import {
  CONTEXT_SWITCH_TURN,
  DEV_MODE_MODEL,
  PRODUCTION_FINAL_STORY_MODEL,
  PRODUCTION_GAME_MODEL,
} from "@/lib/constants";
import {
  createEmptyStoryBible,
  type ActiveBotResponse,
  type ClassifyResponse,
  type FinalStoryResponse,
  type GameMode,
  type StoryBible,
} from "@/lib/navinavTypes";
import { createMessage, extractJson } from "./anthropic";
import {
  inputClassifierUser,
  INPUT_CLASSIFIER_SYSTEM,
  storyBotUser,
  STORY_BOT_SYSTEM,
  endingBotUser,
  ENDING_BOT_SYSTEM,
  cliffhangerBotUser,
  CLIFFHANGER_BOT_SYSTEM,
  finalStoryBotUser,
  FINAL_STORY_BOT_SYSTEM,
} from "./prompts";

function getModel(devMode: boolean, forFinalStory: boolean): string {
  if (devMode) return DEV_MODE_MODEL;
  return forFinalStory ? PRODUCTION_FINAL_STORY_MODEL : PRODUCTION_GAME_MODEL;
}

function getRecentStory(storySoFar: string[], totalTurnCount: number): string {
  const useFull = totalTurnCount <= CONTEXT_SWITCH_TURN;
  if (useFull && storySoFar.length > 0) {
    return storySoFar.join("\n");
  }
  const last3 = storySoFar.slice(-3);
  return last3.join("\n");
}

function getEndingPressure(turnsRemaining: number | null): number {
  if (turnsRemaining === null || turnsRemaining > 4) return 0;
  if (turnsRemaining >= 3) return 1;
  if (turnsRemaining === 2) return 2;
  return 3;
}

function ensureTriple<T>(arr: unknown[], def: T): [T, T, T] {
  const a = Array.isArray(arr) ? arr : [];
  return [
    (typeof a[0] !== "undefined" ? a[0] : def) as T,
    (typeof a[1] !== "undefined" ? a[1] : def) as T,
    (typeof a[2] !== "undefined" ? a[2] : def) as T,
  ];
}

function parseClassify(text: string): ClassifyResponse | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    const input_type = String(o.input_type ?? "bare_beat");
    const cleaned_input = String(o.cleaned_input ?? "").trim();
    const notes = String(o.notes ?? "").trim();
    if (!cleaned_input) return null;
    return { input_type: input_type as ClassifyResponse["input_type"], cleaned_input, notes };
  } catch {
    return null;
  }
}

function parseActiveBotResponse(text: string): ActiveBotResponse | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    const renderings = ensureTriple(
      Array.isArray(o.renderings) ? o.renderings : [],
      ""
    );
    const rendering_tones = ensureTriple(
      Array.isArray(o.rendering_tones) ? o.rendering_tones : [],
      ""
    );
    const next_beats = ensureTriple(
      Array.isArray(o.next_beats) ? o.next_beats : [],
      ""
    );
    const story_bible_update =
      o.story_bible_update != null && typeof o.story_bible_update === "object"
        ? (o.story_bible_update as ActiveBotResponse["story_bible_update"])
        : null;
    return {
      renderings,
      rendering_tones,
      next_beats,
      natural_ending_detected: Boolean(o.natural_ending_detected),
      story_bible_update,
      moral:
        typeof o.moral === "string"
          ? o.moral
          : o.moral === null
            ? null
            : undefined,
      chapter_bible:
        o.chapter_bible != null && typeof o.chapter_bible === "object"
          ? (o.chapter_bible as StoryBible)
          : undefined,
    };
  } catch {
    return null;
  }
}

function parseFinalStoryResponse(text: string): FinalStoryResponse | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    const title = String(o.title ?? "Untitled").trim();
    const story = String(o.story ?? "").trim();
    const preview_sentence = String(o.preview_sentence ?? "").trim();
    if (!story) return null;
    return { title, story, preview_sentence };
  } catch {
    return null;
  }
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
    raw_input?: string;
    cleaned_input?: string;
    input_type?: string;
    story_so_far?: string[];
    story_bible?: StoryBible;
    total_turn_count?: number;
    mode?: GameMode;
    path_turn_limit?: number | null;
    turns_since_decision?: number;
    max_turns?: number;
    moral?: string | null;
    options?: { devMode?: boolean };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const options = body.options ?? {};
  const devMode = options.devMode === true;
  const maxTurns = Math.min(30, Math.max(5, Number(body.max_turns) || 20));

  if (body.action === "classify") {
    const rawInput = String(body.raw_input ?? "").trim();
    if (!rawInput) {
      return NextResponse.json(
        { error: "classify requires raw_input" },
        { status: 400 }
      );
    }
    try {
      const text = await createMessage({
        apiKey,
        model: getModel(devMode, false),
        system: INPUT_CLASSIFIER_SYSTEM,
        messages: [{ role: "user", content: inputClassifierUser(rawInput) }],
        maxTokens: 512,
      });
      const result = parseClassify(text);
      if (!result) {
        return NextResponse.json(
          { error: "Could not parse classifier response", raw: text.slice(0, 500) },
          { status: 502 }
        );
      }
      return NextResponse.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Anthropic API request failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.action === "activeBot") {
    const cleanedInput = String(body.cleaned_input ?? "").trim();
    const inputType = String(body.input_type ?? "pre_generated");
    const storySoFar = Array.isArray(body.story_so_far)
      ? body.story_so_far
      : [];
    const storyBible: StoryBible =
      body.story_bible && typeof body.story_bible === "object"
        ? body.story_bible
        : createEmptyStoryBible();
    const totalTurnCount = Number(body.total_turn_count) || 0;
    const mode = (body.mode as GameMode) ?? "open";
    const pathTurnLimit = body.path_turn_limit ?? null;
    const turnsSinceDecision = Number(body.turns_since_decision) || 0;

    const narrativePosition =
      maxTurns > 0 ? Math.min(1, totalTurnCount / maxTurns) : 0;
    const turnsRemaining =
      pathTurnLimit !== null ? pathTurnLimit - turnsSinceDecision : null;
    const endingPressure = getEndingPressure(turnsRemaining);
    const recentStory = getRecentStory(storySoFar, totalTurnCount);
    const storyBibleStr = JSON.stringify(storyBible, null, 0);

    const isStoryBot = mode === "open" || mode === "continue";
    const isEndingBot = mode === "ending";
    const isCliffhangerBot = mode === "chapter";

    try {
      if (isStoryBot) {
        const userContent = storyBotUser({
          storyBible: storyBibleStr,
          recentStory,
          narrativePosition,
          mode,
          inputType,
          cleanedInput,
        });
        const text = await createMessage({
          apiKey,
          model: getModel(devMode, false),
          system: STORY_BOT_SYSTEM,
          messages: [{ role: "user", content: userContent }],
          maxTokens: 2048,
        });
        const result = parseActiveBotResponse(text);
        if (!result) {
          return NextResponse.json(
            { error: "Could not parse Story Bot response", raw: text.slice(0, 500) },
            { status: 502 }
          );
        }
        return NextResponse.json(result);
      }

      if (isEndingBot) {
        const userContent = endingBotUser({
          storyBible: storyBibleStr,
          recentStory,
          turnsRemaining: turnsRemaining ?? 0,
          endingPressure,
          inputType,
          cleanedInput,
        });
        const text = await createMessage({
          apiKey,
          model: getModel(devMode, false),
          system: ENDING_BOT_SYSTEM,
          messages: [{ role: "user", content: userContent }],
          maxTokens: 2048,
        });
        const result = parseActiveBotResponse(text);
        if (!result) {
          return NextResponse.json(
            { error: "Could not parse Ending Bot response", raw: text.slice(0, 500) },
            { status: 502 }
          );
        }
        return NextResponse.json(result);
      }

      if (isCliffhangerBot) {
        const userContent = cliffhangerBotUser({
          storyBible: storyBibleStr,
          recentStory,
          turnsRemaining: turnsRemaining ?? 0,
          endingPressure,
          inputType,
          cleanedInput,
        });
        const text = await createMessage({
          apiKey,
          model: getModel(devMode, false),
          system: CLIFFHANGER_BOT_SYSTEM,
          messages: [{ role: "user", content: userContent }],
          maxTokens: 2048,
        });
        const result = parseActiveBotResponse(text);
        if (!result) {
          return NextResponse.json(
            {
              error: "Could not parse Cliffhanger Bot response",
              raw: text.slice(0, 500),
            },
            { status: 502 }
          );
        }
        return NextResponse.json(result);
      }

      return NextResponse.json(
        { error: "Unknown mode for activeBot" },
        { status: 400 }
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Anthropic API request failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.action === "finalStory") {
    const storySoFar = Array.isArray(body.story_so_far)
      ? body.story_so_far
      : [];
    const storyBible: StoryBible =
      body.story_bible && typeof body.story_bible === "object"
        ? body.story_bible
        : createEmptyStoryBible();
    const mode = (body.mode as GameMode) ?? "ending";
    const moral = body.moral ?? null;

    const storySoFarText = storySoFar.join("\n");
    const storyBibleStr = JSON.stringify(storyBible, null, 0);

    try {
      const userContent = finalStoryBotUser({
        mode,
        storyBible: storyBibleStr,
        storySoFar: storySoFarText,
        moral,
      });
      const text = await createMessage({
        apiKey,
        model: getModel(devMode, true),
        system: FINAL_STORY_BOT_SYSTEM,
        messages: [{ role: "user", content: userContent }],
        maxTokens: 2048,
      });
      const result = parseFinalStoryResponse(text);
      if (!result) {
        return NextResponse.json(
          {
            error: "Could not parse Final Story Bot response",
            raw: text.slice(0, 500),
          },
          { status: 502 }
        );
      }
      return NextResponse.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Anthropic API request failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: "Unknown action. Use classify, activeBot, or finalStory." },
    { status: 400 }
  );
}
