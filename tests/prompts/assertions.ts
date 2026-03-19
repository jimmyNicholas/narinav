// Returns true if none of the spatial words appear in the text
export function noSpatialCommitment(text: string): boolean {
  const spatial = [
    "window",
    "room",
    "door",
    "outside",
    "indoors",
    "street",
    "kitchen",
    "bedroom",
    "hallway",
    "building",
    "house",
    "office",
    "corridor",
    "staircase",
    "garden",
    "park",
    "city",
    "london",
    "table",
    "floor",
    "ceiling",
    "wall",
  ];
  const lower = text.toLowerCase();
  return !spatial.some((w) => lower.includes(w));
}

// Returns true if none of the assumed-character phrases appear
export function noAssumedCharacter(text: string): boolean {
  const lower = text.toLowerCase();

  // Use word boundaries to avoid false positives (e.g. "the " matching "he ").
  const pronounOrSomeone = /\b(he|she|they|her|his|their|someone)\b/i;
  if (pronounOrSomeone.test(lower)) return false;

  const assumedNouns = /\b(a man|a woman|a figure)\b/i;
  if (assumedNouns.test(lower)) return false;

  return true;
}

// Returns true if all three beats are meaningfully distinct
// (checks that no two beats share more than 2 content words)
export function beatsAreDistinct(beats: string[]): boolean {
  if (beats.length < 3) return false;
  const words = beats.map((b) =>
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const shared = words[i].filter((w) => words[j].includes(w));
      if (shared.length > 2) return false;
    }
  }
  return true;
}

// Returns true if the word does not appear in any rendering
export function wordNotInRenderings(word: string, renderings: string[]): boolean {
  const lower = word.toLowerCase();
  return renderings.every((r) => !r.toLowerCase().includes(lower));
}

// Returns true if rendering[0] contains at least 3 words from the original input
export function preservesPlayerVoice(original: string, rendering: string): boolean {
  const origWords = original
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const renderWords = rendering.toLowerCase();
  const matches = origWords.filter((w) => renderWords.includes(w));
  return matches.length >= Math.min(3, origWords.length);
}

// Returns true if the array has no entry where name matches a known sensation pattern
export function noSensationsAsObjects(objects: { name: string }[]): boolean {
  const sensations = [
    "scent",
    "smell",
    "taste",
    "flavor",
    "flavour",
    "sound",
    "feeling",
    "warmth",
    "chill",
  ];
  return objects.every((o) =>
    sensations.every((s) => !o.name?.toLowerCase().includes(s))
  );
}

