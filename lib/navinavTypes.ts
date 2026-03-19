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

export type ThreadStatus = "new" | "open" | "resolved";

export type StoryBibleThread = {
  text: string;
  status: ThreadStatus;
};

export type StoryBibleNarrator = {
  voice: string | null;
  register: "mundane" | "literary" | "uncanny" | "playful" | null;
  interiority: "high" | "low" | null;
};

export type StoryBibleTrajectory = "inward" | "outward" | "relational";

export type StoryBibleMeta = {
  /** High-level genre label, e.g. 'cozy mystery', 'solar punk coming-of-age'. */
  genre?: string | null;
  /** Baseline mood of the story overall (not per-scene). */
  tone_baseline?: string | null;
  /** Intended audience or age band, if relevant. */
  audience?: string | null;
};

export type StoryBibleStyleGuidelines = {
  /** Prose style, e.g. 'lean, concrete, present-tense; minimal adverbs'. */
  prose_style?: string | null;
  /** Point of view, e.g. 'first-person', 'third-limited on Alice'. */
  pov?: string | null;
  /** Things the prose should avoid doing. */
  do_not?: string[];
};

export type StoryBibleRulesOfWorld = {
  /** Rough tech or historical level, e.g. 'near-future', 'late medieval'. */
  tech_level?: string | null;
  /** Brief description of any magic or speculative system, if present. */
  magic_system?: string | null;
  /** Hard constraints and world rules the story should not violate. */
  constraints?: string[];
};

/** Max number of resolved threads to keep (oldest resolved are dropped). */
export const MAX_RESOLVED_THREADS = 5;

export type StoryBible = {
  title: string | null;
  summary: string | null;
  tone_established: string | null;
  /** High-level genre / tone / audience metadata. */
  meta?: StoryBibleMeta | null;
  /** Style and POV guidelines for prose. */
  style_guidelines?: StoryBibleStyleGuidelines | null;
  /** Constraints and rules of the world. */
  rules_of_world?: StoryBibleRulesOfWorld | null;
  characters: StoryBibleCharacter[];
  places: StoryBiblePlace[];
  objects: StoryBibleObject[];
  /** Threads with status; resolved threads capped to last MAX_RESOLVED_THREADS. */
  threads: StoryBibleThread[];
  /** Single thread that is most urgent/important for the story right now. */
  primary_thread: string | null;
  cliffhanger_summary: string | null;

  narrator?: StoryBibleNarrator | null;
  trajectory?: StoryBibleTrajectory | null;
  opening_complete?: boolean;
  missing?: string[];
};

export type StoryBibleUpdate = Partial<{
  title: string | null;
  summary: string | null;
  tone_established: string | null;
  meta: StoryBibleMeta | null;
  style_guidelines: StoryBibleStyleGuidelines | null;
  rules_of_world: StoryBibleRulesOfWorld | null;
  characters: StoryBibleCharacter[];
  places: StoryBiblePlace[];
  objects: StoryBibleObject[];
  threads: StoryBibleThread[];
  primary_thread: string | null;
  cliffhanger_summary: string | null;

  narrator: StoryBibleNarrator | null;
  trajectory: StoryBibleTrajectory | null;
  opening_complete: boolean;
  missing: string[];
}>;

export function createEmptyStoryBible(): StoryBible {
  return {
    title: null,
    summary: null,
    tone_established: null,
    meta: null,
    style_guidelines: null,
    rules_of_world: null,
    characters: [],
    places: [],
    objects: [],
    threads: [],
    primary_thread: null,
    cliffhanger_summary: null,

    narrator: null,
    trajectory: null,
    opening_complete: false,
    missing: [],
  };
}

/** Keep at most the last MAX_RESOLVED_THREADS resolved threads; all new/open stay. */
function capResolvedThreads(
  threads: StoryBibleThread[],
  maxResolved: number
): StoryBibleThread[] {
  const openAndNew = threads.filter((t) => t.status !== "resolved");
  const resolved = threads.filter((t) => t.status === "resolved");
  const keptResolved = resolved.slice(-maxResolved);
  return [...openAndNew, ...keptResolved];
}

/** Normalize legacy bible (e.g. open_threads) into threads + primary_thread. */
export function normalizeStoryBible(bible: Partial<StoryBible>): StoryBible {
  const base = {
    title: bible.title ?? null,
    summary: bible.summary ?? null,
    tone_established: bible.tone_established ?? null,
    meta: bible.meta ?? null,
    style_guidelines: bible.style_guidelines ?? null,
    rules_of_world: bible.rules_of_world ?? null,
    characters: Array.isArray(bible.characters) ? bible.characters : [],
    places: Array.isArray(bible.places) ? bible.places : [],
    objects: Array.isArray(bible.objects) ? bible.objects : [],
    cliffhanger_summary: bible.cliffhanger_summary ?? null,

    narrator: bible.narrator ?? null,
    trajectory: bible.trajectory ?? null,
    opening_complete: bible.opening_complete ?? false,
    missing: Array.isArray(bible.missing) ? bible.missing : [],
  };
  if (Array.isArray(bible.threads) && bible.threads.length > 0) {
    return {
      ...base,
      threads: capResolvedThreads(bible.threads, MAX_RESOLVED_THREADS),
      primary_thread: bible.primary_thread ?? null,
    };
  }
  const legacy = (bible as Partial<StoryBible & { open_threads?: string[] }>)
    .open_threads;
  if (Array.isArray(legacy) && legacy.length > 0) {
    return {
      ...base,
      threads: legacy.map((text) => ({ text, status: "open" as ThreadStatus })),
      primary_thread: bible.primary_thread ?? legacy[0] ?? null,
    };
  }
  return {
    ...base,
    threads: [],
    primary_thread: bible.primary_thread ?? null,
  };
}

/**
 * Merge a story bible delta into the current bible.
 * - Only applies fields that are present in delta (no wiping).
 * - Characters, places, objects: merge by name (delta overwrites same name).
 * - Threads: replace with delta's list, then cap resolved to last MAX_RESOLVED_THREADS.
 */
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
  if (delta.meta !== undefined) next.meta = delta.meta;
  if (delta.style_guidelines !== undefined)
    next.style_guidelines = delta.style_guidelines;
  if (delta.rules_of_world !== undefined)
    next.rules_of_world = delta.rules_of_world;
  if (delta.cliffhanger_summary !== undefined)
    next.cliffhanger_summary = delta.cliffhanger_summary;

  if (delta.primary_thread !== undefined) next.primary_thread = delta.primary_thread;

  if (delta.narrator !== undefined) next.narrator = delta.narrator;
  if (delta.trajectory !== undefined) next.trajectory = delta.trajectory;
  if (delta.opening_complete !== undefined)
    next.opening_complete = delta.opening_complete;
  if (delta.missing !== undefined) next.missing = delta.missing;

  if (delta.characters !== undefined) {
    const byName = new Map(current.characters.map((c) => [c.name, c]));
    for (const c of delta.characters) byName.set(c.name, c);
    next.characters = Array.from(byName.values());
  }
  if (delta.places !== undefined) {
    const byName = new Map(current.places.map((p) => [p.name, p]));
    for (const p of delta.places) byName.set(p.name, p);
    next.places = Array.from(byName.values());
  }
  if (delta.objects !== undefined) {
    const byName = new Map(current.objects.map((o) => [o.name, o]));
    for (const o of delta.objects) byName.set(o.name, o);
    next.objects = Array.from(byName.values());
  }

  if (delta.threads !== undefined) {
    next.threads = capResolvedThreads(delta.threads, MAX_RESOLVED_THREADS);
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
