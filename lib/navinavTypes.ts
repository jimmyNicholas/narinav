/**
 * Navinav types: story bible, session state, turn state, API shapes.
 */

export type GameMode = "open" | "ending" | "chapter" | "continue";

export type StoryBibleCharacter = {
  name: string;
  description: string;
  last_seen: string | null;
};

export type StoryBiblePlace = {
  name: string;
  description: string;
};

export type StoryBibleObject = {
  name: string;
  significance: string;
};

export type StoryBible = {
  title: string | null;
  summary: string | null;
  tone_established: string | null;
  characters: StoryBibleCharacter[];
  places: StoryBiblePlace[];
  objects: StoryBibleObject[];
  open_threads: string[];
  cliffhanger_summary: string | null;
};

export type StoryBibleUpdate = Partial<{
  title: string | null;
  summary: string | null;
  tone_established: string | null;
  characters: StoryBibleCharacter[];
  places: StoryBiblePlace[];
  objects: StoryBibleObject[];
  open_threads: string[];
  cliffhanger_summary: string | null;
}>;

export function createEmptyStoryBible(): StoryBible {
  return {
    title: null,
    summary: null,
    tone_established: null,
    characters: [],
    places: [],
    objects: [],
    open_threads: [],
    cliffhanger_summary: null,
  };
}

/** Merge a story bible delta into the current bible (append arrays, dedup by name). */
export function mergeStoryBible(
  current: StoryBible,
  delta: StoryBibleUpdate | null
): StoryBible {
  if (!delta) return current;

  const next: StoryBible = { ...current };

  if (delta.title !== undefined) next.title = delta.title;
  if (delta.summary !== undefined) next.summary = delta.summary;
  if (delta.tone_established !== undefined)
    next.tone_established = delta.tone_established;
  if (delta.cliffhanger_summary !== undefined)
    next.cliffhanger_summary = delta.cliffhanger_summary;

  if (delta.characters?.length) {
    const byName = new Map(current.characters.map((c) => [c.name, c]));
    for (const c of delta.characters) byName.set(c.name, c);
    next.characters = Array.from(byName.values());
  }
  if (delta.places?.length) {
    const byName = new Map(current.places.map((p) => [p.name, p]));
    for (const p of delta.places) byName.set(p.name, p);
    next.places = Array.from(byName.values());
  }
  if (delta.objects?.length) {
    const byName = new Map(current.objects.map((o) => [o.name, o]));
    for (const o of delta.objects) byName.set(o.name, o);
    next.objects = Array.from(byName.values());
  }
  if (delta.open_threads?.length) {
    const seen = new Set(current.open_threads);
    for (const t of delta.open_threads) if (!seen.has(t)) seen.add(t);
    next.open_threads = Array.from(seen);
  }

  return next;
}

export type InputType =
  | "bare_beat"
  | "crafted_prose"
  | "gibberish"
  | "non_english"
  | "pre_generated";

/** Session state — persists the whole game. */
export type SessionState = {
  story_so_far: string[];
  story_bible: StoryBible;
  total_turn_count: number;
  mode: GameMode;
  decision_count: number;
  path_turn_limit: number | null;
  turns_since_decision: number;
  chapter_number: number;
  final_story: string | null;
  moral: string | null;
  chapter_bible: StoryBible | null;
};

/** Active bot response (Story / Ending / Cliffhanger). */
export type ActiveBotResponse = {
  renderings: [string, string, string];
  rendering_tones: [string, string, string];
  next_beats: [string, string, string];
  natural_ending_detected: boolean;
  story_bible_update: StoryBibleUpdate | null;
  moral?: string | null;
  chapter_bible?: StoryBible | null;
};

/** Classify response. */
export type ClassifyResponse = {
  input_type: InputType;
  cleaned_input: string;
  notes: string;
};

/** Final Story Bot response. */
export type FinalStoryResponse = {
  title: string;
  story: string;
  preview_sentence: string;
};
