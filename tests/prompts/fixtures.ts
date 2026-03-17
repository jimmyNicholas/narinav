import type { StoryBible } from "@/lib/navinavTypes";

export const emptyBible: StoryBible = {
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
};

// One confirmed place, no characters, no threads
export const openingBible: StoryBible = {
  ...emptyBible,
  tone_established: "wistful",
  places: [{ name: "bedroom", description: "warm, quiet" }],
};

// Mid-story bible with characters, place, and active threads
export const midBible: StoryBible = {
  ...emptyBible,
  title: "The Inheritance",
  tone_established: "tense, uneasy",
  characters: [
    { name: "Marcus", description: "the narrator's estranged uncle", last_seen: "doorway" },
  ],
  places: [{ name: "study", description: "book-lined, dusty, dim" }],
  objects: [{ name: "letter", significance: "unopened, from the narrator's father" }],
  threads: [
    { text: "What does the letter contain?", status: "open" },
    { text: "Why has Marcus arrived unannounced?", status: "open" },
  ],
  primary_thread: "What does the letter contain?",
  cliffhanger_summary: null,
};

// Rich bible for continue-mode tests
export const richBible: StoryBible = {
  ...midBible,
  threads: [
    { text: "What does the letter contain?", status: "open" },
    { text: "Why has Marcus arrived unannounced?", status: "open" },
    { text: "Who sent the border collie?", status: "new" },
  ],
  primary_thread: "What does the letter contain?",
};

