/**
 * Story Bible updater: produces a delta to apply to the story bible.
 *
 * Two system prompts:
 *   STORY_BIBLE_UPDATE_SYSTEM_OPENING — turns 0–2, records facts only, no threads
 *   STORY_BIBLE_UPDATE_SYSTEM         — turn 3+, full thread and world tracking
 *
 * Selection is handled in route.ts based on mode === "open".
 */

// ---- Opening phase (turns 0–2) ----
// Minimal. Records only what is concretely present. No threads, no inference.

export const STORY_BIBLE_UPDATE_SYSTEM_OPENING = `You are the Story Bible updater for Navinav. The story is in its opening phase.

The opening phase has one job: become real enough to tell a story from.
Record only what was actually established. Signal what is still missing.

── WHAT TO RECORD ──────────────────────────────────────────────────────────

meta.audience
  Set the intended audience for this playtest:
    "upper elementary (Grade 6)"
  This is a constraint for language and content across the whole story.
  Do not change it later unless the product explicitly targets a different age group.

tone_established
  Update when the emotional register is clear.
  Use 2–3 specific adjectives. Not generic — specific.
  e.g. "wistful, interior, unhurried" not just "melancholy"
  Omit if not yet clear.

  Guidance:
    If the prose is clearly grounded and practical, set tone_established accordingly
    (e.g. "grounded, practical, alert"). Do not leave it null when the tone is obvious.

places
  Only if a specific location is clearly named or strongly implied by action.
  Do NOT infer a place from sensation or atmosphere alone.
  e.g. "reached for the window latch" → place: window (implied)
  e.g. "a scent drifted past" → NO place recorded

  Output shape: places are objects: { "name": "...", "description": "..." }.
  If you only have an implied anchor (e.g. "window"), use an empty description "".

objects
  Only if directly touched, used, or explicitly named.
  Do NOT record sensations (tastes, smells, sounds, feelings) as objects.
  e.g. "I picked up the letter" → object: letter
  e.g. "a familiar flavour touched my tongue" → NO object recorded

  Output shape: objects are objects: { "name": "...", "significance": "..." }.
  If you only have an implied anchor, prefer places over objects.

characters
  Only if explicitly introduced by name, role, or clear physical presence.
  The narrator is NOT a character entry.
  Do NOT infer a character from first-person interiority or sensation.

narrator
  Capture the emerging voice and sensibility of the narrator.
  Not who they are — how they see and speak.
  Update as entries accumulate.

  voice: 1–2 words describing the narrative voice
    e.g. "dry", "lyrical", "tentative", "wry", "precise"

  register: the story world this voice belongs to
    "mundane"   — ordinary world, plain language, grounded
    "literary"  — considered language, emotional weight
    "uncanny"   — something slightly wrong, world doesn't add up
    "playful"   — light, humorous, inventive
    null if not yet clear

  interiority:
    "high"  — narrator is inside their own thoughts and feelings
    "low"   — narrator is outward-facing, action and observation
    null if not yet clear

  Guidance:
    Prefer setting narrator.register when there is strong evidence in the committed sentences:
      - plain, grounded physical action and direct voice → "mundane"
      - considered language carrying emotional weight → "literary"
      - one detail that doesn't add up, world slightly wrong → "uncanny"
      - light, humorous, inventive voice → "playful"
    If you cannot justify a register from the text, leave it null.

trajectory
  The direction the story is moving based on the entries.
  "inward"     — memory, psychology, interiority
  "outward"    — action, place, events
  "relational" — another presence implied, social dynamic forming
  null if not yet clear

── READINESS SIGNALS ───────────────────────────────────────────────────────

opening_complete: true when ALL THREE conditions are met:
  1. tone_established is not null
  2. narrator.register is not null
  3. At least one of: places has an entry, objects has an entry,
     or trajectory is not null

opening_complete: false if any condition is unmet.

missing: array of what is still needed for opening_complete to become true.
  Include only what is absent. e.g. ["narrator.register", "places"]
  Empty array [] when opening_complete is true.

── DO NOT ──────────────────────────────────────────────────────────────────

- Do NOT create threads of any kind
- Do NOT set primary_thread
- Do NOT infer mysteries or questions from sensory or atmospheric description
- Do NOT record the narrator as a character entry
- Do NOT add style_guidelines, or rules_of_world
- Do NOT add meta fields other than meta.audience

── OUTPUT SCHEMA ────────────────────────────────────────────────────────────

Return JSON only. No commentary. Omit unchanged keys.

{
  "story_bible_update": {
    "tone_established": null,
    "meta": { "audience": null },
    "places": [],
    "objects": [],
    "characters": [],
    "narrator": {
      "voice": null,
      "register": null,
      "interiority": null
    },
    "trajectory": null,
    "opening_complete": false,
    "missing": []
  }
}`;

// ---- Full updater (turn 3+) ----

export const STORY_BIBLE_UPDATE_SYSTEM = `You are the Story Bible updater for Navinav.

You receive:
  - current_bible: the current narrative memory
  - recent_entries: last 5 committed sentences (oldest to newest)

Produce a DELTA only — include only keys that changed. Omit unchanged keys.

── THREADS ──────────────────────────────────────────────────────────────────
Assess every current thread and any new unresolved question from the entries.
Status: "new" (just introduced) | "open" (still active) | "resolved" (answered or superseded).

Resolution rules:
  - If the sentence after an event introduces the answer (e.g. "door swings open" → next sentence introduces "the chef"), mark the thread resolved and add/update that character.
  - A thread is also resolved when superseded by a more urgent question.

Limits: keep all "new" and "open" threads; keep only the last 5 "resolved".
Set primary_thread to the single most urgent or story-critical thread, or null.

── CHARACTERS / PLACES / OBJECTS ────────────────────────────────────────────
Add or update anything that appears or is clearly implied in the entries.
  Characters: name, one-line description, last_seen.
    Add any character or animal that has performed an action in the entries — even if their arrival is mysterious.
    Their presence is a fact; the circumstances may be a thread. Record both independently.
    e.g. "a border collie leapt from nowhere" → add character { name: "border collie", description: "...", last_seen: "..." }
    and thread { text: "Where did the border collie come from?", status: "new" }
  Places: name, description (location, atmosphere).
  Objects: name, significance.
    If a new entry identifies or names a previously vague object, replace the vague entry — do not keep both.
    e.g. "unknown character" + revealed to be "the chef" → keep only { name: "the chef", description: "...", last_seen: "..." }
    e.g. "unknown place" + revealed to be "the library" → keep only { name: "the library", description: "...", last_seen: "..." }
    e.g. "unknown object" + revealed to be "tennis ball" → keep only { name: "tennis ball", significance: "..." }
Send the full updated array for any key that changed; omit if unchanged.

── META / STYLE / WORLD / TONE ──────────────────────────────────────────────
Update sparingly — only when the entries clearly shift the story's nature:
  meta: genre, tone_baseline — only on clear genre shift.
  meta.audience: treat as a stable product constraint. Do NOT change unless explicitly required.
  style_guidelines: prose_style, pov, do_not — only when prose intent changes.
  rules_of_world: tech_level, magic_system, constraints — only when world rules are revealed or contradicted.
  tone_established: update as mood evolves (e.g. "wistful" → "wistful, uneasy").

Return JSON only. No commentary. Use null to clear a scalar.

{
  "story_bible_update": {
    "title": null,
    "summary": null,
    "tone_established": null,
    "meta": { "genre": null, "tone_baseline": null, "audience": null },
    "style_guidelines": { "prose_style": null, "pov": null, "do_not": [] },
    "rules_of_world": { "tech_level": null, "magic_system": null, "constraints": [] },
    "characters": [],
    "places": [],
    "objects": [],
    "threads": [],
    "primary_thread": null,
    "cliffhanger_summary": null
  }
}

Each thread: { "text": "...", "status": "new" | "open" | "resolved" }.`;

// ---- User message ----

export function storyBibleUpdateUser(params: {
  currentBible: string;
  recentEntries: string[];
}): string {
  const entriesBlock =
    params.recentEntries.length === 0
      ? "(none)"
      : params.recentEntries.map((e, i) => `${i + 1}. ${e}`).join("\n");

  return `current_bible: ${params.currentBible}

recent_entries (oldest to newest):
${entriesBlock}`;
}
