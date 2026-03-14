export const STORY_PAYLOAD_MESSAGE_TYPE = "story-buddy-payload";

export type StoryPayload = {
  story_so_far?: string;
  message_to_player?: string;
  choices?: string[];
  /** Agent sometimes sends options as separate keys instead of choices[] */
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  final_title?: string;
  final_story?: string;
  allow_custom_input?: boolean;
};

/**
 * Voiceflow sometimes emits the template literally, e.g. "{message_to_player}"
 * instead of substituting variables. Whole-string {name} tokens are treated as unresolved.
 */
const PLACEHOLDER_TOKEN = /^\{[a-zA-Z0-9_]+\}$/;

export function isPlaceholderToken(s: string): boolean {
  return PLACEHOLDER_TOKEN.test(s.trim());
}

/** Normalize choices without filtering placeholders (for detection) */
export function normalizeChoicesRaw(p: StoryPayload): string[] {
  if (Array.isArray(p.choices) && p.choices.length > 0) {
    return p.choices.filter(
      (c): c is string => typeof c === "string" && c.trim().length > 0
    );
  }
  return [p.choice_a, p.choice_b, p.choice_c].filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0
  );
}

/** Normalize choice_a/b/c or choices into a string[] for the UI; drops unresolved placeholders */
export function normalizeChoices(p: StoryPayload): string[] {
  return normalizeChoicesRaw(p).filter((c) => !isPlaceholderToken(c));
}

/** True if payload still has template placeholders (agent didn't substitute before trace) */
export function payloadHasUnresolvedPlaceholders(p: StoryPayload): boolean {
  const msg = String(p.message_to_player ?? "").trim();
  if (msg && isPlaceholderToken(msg)) return true;
  const choices = normalizeChoicesRaw(p);
  if (choices.some((c) => isPlaceholderToken(c))) return true;
  return false;
}

/** Use message_to_player only when it's not a literal placeholder string */
export function resolveMessageToPlayer(
  raw: string | number | undefined
): string {
  const str = String(raw ?? "");
  // Handle \\n and \\\\n (double-escaped from Voiceflow)
  const s = str.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").trim();
  if (!s || isPlaceholderToken(s)) return "";
  return str.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
}

/** Parse story text into display segments */
export function parseStoryLines(story: string | number): string[] {
  return String(story ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\*\s*/, "").trim())
    .filter(Boolean);
}

/** Try to parse story payload from trace.payload (string or object, or nested). */
export function parseStoryPayloadFromTrace(trace: {
  payload?: unknown;
  type?: string;
}): StoryPayload | null {
  let raw = trace?.payload;

  // Custom Action JSON body can be object directly
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (
      "story_so_far" in o ||
      "message_to_player" in o ||
      Array.isArray(o.choices)
    ) {
      return raw as StoryPayload;
    }
    // Sometimes wrapped e.g. { body: "{...}" } or { data: {...} }
    const nested = o.body ?? o.data ?? o.json ?? o.payload ?? o.message;
    if (nested != null) raw = nested;
  }

  if (typeof raw === "string") {
    let s = raw.trim();
    // Voiceflow "Send JSON" step can prefix the body with "Send JSON "
    s = s.replace(/^Send\s+JSON\s*/i, "").trim();
    if (!s.includes("story_so_far") && !s.includes("message_to_player"))
      return null;

    /** Parse JSON string; if result is still a string (double-encoded), parse again. */
    function destring(input: string): unknown {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === "string" ? destring(parsed) : parsed;
      } catch {
        return null;
      }
    }

    // Try direct parse first (clean JSON from JSON.stringify in Voiceflow)
    let parsed = destring(s);
    if (
      parsed != null &&
      typeof parsed === "object" &&
      "story_so_far" in (parsed as object)
    ) {
      return parsed as StoryPayload;
    }

    // Fallback: extract { ... } block and fix literal newlines in string values
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    const jsonStr = start >= 0 && end > start ? s.slice(start, end + 1) : s;
    const normalized = jsonStr.replace(
      /(?<!\\)"(?:[^"\\]|\\.)*"/g,
      (match) => match.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
    );
    parsed = destring(normalized) ?? destring(jsonStr);
    return parsed != null && typeof parsed === "object"
      ? (parsed as StoryPayload)
      : null;
  }

  if (raw != null && typeof raw === "object") {
    return raw as StoryPayload;
  }

  return null;
}

