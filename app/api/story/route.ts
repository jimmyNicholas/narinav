import { NextResponse } from "next/server";
import {
  CONTEXT_SWITCH_TURN,
  DEV_MODE_MODEL,
  OPENING_TURNS,
  PRODUCTION_FINAL_STORY_MODEL,
  PRODUCTION_GAME_MODEL,
} from "@/lib/constants";
import {
  createEmptyStoryBible,
  normalizeStoryBible,
  type ClassifyResponse,
  type FinalStoryResponse,
  type GameMode,
  type StoryBible,
  type StoryBibleThread,
  type StoryBibleUpdate,
  type ThreadStatus,
} from "@/lib/navinavTypes";
import { createMessage, extractJson } from "./anthropic";
import {
  inputClassifierUser,
  INPUT_CLASSIFIER_SYSTEM,
  beatBotUser,
  getBeatBotSystem,
  type BeatBotMode,
  refinementBotUser,
  getRefinementSystem,
  storyBibleUpdateUser,
  STORY_BIBLE_UPDATE_SYSTEM_OPENING,
  STORY_BIBLE_UPDATE_SYSTEM,
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

const THREAD_STATUSES: ThreadStatus[] = ["new", "open", "resolved"];

const STORY_BIBLE_UPDATE_KEYS = new Set([
  "title", "summary", "tone_established", "meta", "style_guidelines",
  "rules_of_world", "characters", "places", "objects", "threads",
  "primary_thread", "cliffhanger_summary",
]);

function parseStoryBibleUpdateResponse(text: string): StoryBibleUpdate | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    let update: Record<string, unknown>;
    if (o.story_bible_update != null && typeof o.story_bible_update === "object") {
      update = o.story_bible_update as Record<string, unknown>;
    } else if (Object.keys(o).some((k) => STORY_BIBLE_UPDATE_KEYS.has(k))) {
      update = o;
    } else {
      return null;
    }
    const out: StoryBibleUpdate = {};

    if (update.title !== undefined) out.title = update.title as string | null;
    if (update.summary !== undefined) out.summary = update.summary as string | null;
    if (update.tone_established !== undefined)
      out.tone_established = update.tone_established as string | null;
    if (update.cliffhanger_summary !== undefined)
      out.cliffhanger_summary = update.cliffhanger_summary as string | null;
    if (update.primary_thread !== undefined)
      out.primary_thread = update.primary_thread as string | null;

    if (Array.isArray(update.characters)) out.characters = update.characters as StoryBible["characters"];
    if (Array.isArray(update.places)) out.places = update.places as StoryBible["places"];
    if (Array.isArray(update.objects)) out.objects = update.objects as StoryBible["objects"];

    if (Array.isArray(update.threads)) {
      const threads: StoryBibleThread[] = [];
      for (const t of update.threads) {
        if (t == null || typeof t !== "object") continue;
        const obj = t as Record<string, unknown>;
        const text = typeof obj.text === "string" ? obj.text.trim() : "";
        const status = THREAD_STATUSES.includes(obj.status as ThreadStatus)
          ? (obj.status as ThreadStatus)
          : "open";
        if (text) threads.push({ text, status });
      }
      if (threads.length > 0) out.threads = threads;
    }

    return out;
  } catch {
    return null;
  }
}

function parseBeatBotResponse(text: string): { next_beats: [string, string, string] } | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    const next_beats = ensureTriple(
      Array.isArray(o.next_beats) ? o.next_beats : [],
      ""
    );
    return { next_beats };
  } catch {
    return null;
  }
}

function parseRefinementBotResponse(
  text: string,
  mode?: "ending" | "chapter"
): {
  renderings: [string, string, string];
  natural_ending_detected: boolean;
  moral?: string | null;
  chapter_bible?: StoryBible | null;
} | null {
  try {
    const json = extractJson(text);
    const o = JSON.parse(json) as Record<string, unknown>;
    const renderings = ensureTriple(
      Array.isArray(o.renderings) ? o.renderings : [],
      ""
    );
    const out: {
      renderings: [string, string, string];
      natural_ending_detected: boolean;
      moral?: string | null;
      chapter_bible?: StoryBible | null;
    } = {
      renderings,
      natural_ending_detected: Boolean(o.natural_ending_detected),
    };
    if (mode === "ending")
      out.moral =
        typeof o.moral === "string" ? o.moral : o.moral === null ? null : undefined;
    if (
      mode === "chapter" &&
      o.chapter_bible != null &&
      typeof o.chapter_bible === "object"
    )
      out.chapter_bible = normalizeStoryBible(o.chapter_bible as Partial<StoryBible>);
    return out;
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
    current_bible?: StoryBible;
    latest_entry?: string;
    recent_entries?: string[];
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

  if (body.action === "beatBot") {
    const storySoFar = Array.isArray(body.story_so_far)
      ? body.story_so_far
      : [];
    const storyBible: StoryBible =
      body.story_bible && typeof body.story_bible === "object"
        ? body.story_bible
        : createEmptyStoryBible();
    const totalTurnCount = Number(body.total_turn_count) || 0;
    const mode = (body.mode as GameMode) ?? "open";
    // Open mode runs for turns 0–2 (opening zone); then continue. Ending/chapter pass through.
    const effectiveMode: BeatBotMode =
      mode === "ending" || mode === "chapter"
        ? (mode as BeatBotMode)
        : totalTurnCount < OPENING_TURNS
          ? "open"
          : "continue";
    const beatMode = effectiveMode;
    const narrativePosition =
      maxTurns > 0 ? Math.min(1, totalTurnCount / maxTurns) : 0;
    const recentStory = getRecentStory(storySoFar, totalTurnCount);
    const storyBibleStr = JSON.stringify(storyBible, null, 0);
    try {
      const userContent = beatBotUser({
        storyBible: storyBibleStr,
        recentStory,
        narrativePosition,
        mode,
      });
      const text = await createMessage({
        apiKey,
        model: getModel(devMode, false),
        system: getBeatBotSystem(beatMode),
        messages: [{ role: "user", content: userContent }],
        maxTokens: 512,
      });
      const result = parseBeatBotResponse(text);
      if (!result) {
        return NextResponse.json(
          { error: "Could not parse Beat Bot response", raw: text.slice(0, 500) },
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

  if (body.action === "refinementBot") {
    const storySoFar = Array.isArray(body.story_so_far)
      ? body.story_so_far
      : [];
    const storyBible: StoryBible =
      body.story_bible && typeof body.story_bible === "object"
        ? body.story_bible
        : createEmptyStoryBible();
    const cleanedInput = String(body.cleaned_input ?? "").trim();
    const inputType = String(body.input_type ?? "pre_generated");
    const mode = (body.mode as GameMode) ?? "open";
    const totalTurnCount = Number(body.total_turn_count) || 0;
    const pathTurnLimit = body.path_turn_limit ?? null;
    const turnsSinceDecision = Number(body.turns_since_decision) ?? 0;
    const turnsRemaining =
      pathTurnLimit !== null ? pathTurnLimit - turnsSinceDecision : null;
    const endingPressure = getEndingPressure(turnsRemaining);
    const closeType =
      mode === "chapter" ? "chapter" : mode === "ending" ? "story" : undefined;
    const recentStory = getRecentStory(storySoFar, totalTurnCount);
    const storyBibleStr = JSON.stringify(storyBible, null, 0);
    if (!cleanedInput) {
      return NextResponse.json(
        { error: "refinementBot requires cleaned_input" },
        { status: 400 }
      );
    }
    try {
      const userContent = refinementBotUser({
        storyBible: storyBibleStr,
        recentStory,
        mode,
        inputType,
        cleanedInput,
        ...(mode === "ending" || mode === "chapter"
          ? {
              turnsRemaining: turnsRemaining ?? 0,
              endingPressure,
              closeType: closeType!,
            }
          : {}),
      });
      const system = getRefinementSystem(
        mode,
        mode === "ending" || mode === "chapter" ? endingPressure : undefined,
        closeType ?? undefined
      );
      const text = await createMessage({
        apiKey,
        model: getModel(devMode, false),
        system,
        messages: [{ role: "user", content: userContent }],
        maxTokens: 2048,
      });
      const result = parseRefinementBotResponse(
        text,
        mode === "ending" ? "ending" : mode === "chapter" ? "chapter" : undefined
      );
      if (!result) {
        return NextResponse.json(
          {
            error: "Could not parse Refinement Bot response",
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

  if (body.action === "storyBibleUpdate") {
    const rawBible =
      body.current_bible && typeof body.current_bible === "object"
        ? body.current_bible
        : {};
    const currentBible = normalizeStoryBible(rawBible as Partial<StoryBible>);

    const recentEntriesRaw = Array.isArray(body.recent_entries)
      ? body.recent_entries
      : body.latest_entry !== undefined
        ? [String(body.latest_entry).trim()]
        : [];
    const recentEntries = recentEntriesRaw
      .map((e: unknown) => String(e).trim())
      .filter(Boolean)
      .slice(-5);
    if (recentEntries.length === 0) {
      return NextResponse.json(
        { error: "storyBibleUpdate requires recent_entries (or latest_entry)" },
        { status: 400 }
      );
    }

    try {
      const mode =
        body.mode === "open" ||
        body.mode === "continue" ||
        body.mode === "ending" ||
        body.mode === "chapter"
          ? (body.mode as BeatBotMode)
          : "continue";
      const system =
        mode === "open"
          ? STORY_BIBLE_UPDATE_SYSTEM_OPENING
          : STORY_BIBLE_UPDATE_SYSTEM;
      const userContent = storyBibleUpdateUser({
        currentBible: JSON.stringify(currentBible, null, 0),
        recentEntries,
      });
      const text = await createMessage({
        apiKey,
        model: getModel(devMode, false),
        system,
        messages: [{ role: "user", content: userContent }],
        maxTokens: 1024,
      });
      const story_bible_update = parseStoryBibleUpdateResponse(text);
      if (!story_bible_update) {
        return NextResponse.json(
          {
            error: "Could not parse Story Bible Update response",
            raw: text.slice(0, 500),
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ story_bible_update });
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
    {
      error: "Unknown action. Use classify, beatBot, refinementBot, storyBibleUpdate, or finalStory.",
    },
    { status: 400 }
  );
}
