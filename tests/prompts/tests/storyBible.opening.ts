import { emptyBible } from "../fixtures";
import { noSensationsAsObjects } from "../assertions";
import type { TestCase } from "../runner";

export const storyBibleOpeningTests: TestCase[] = [
  {
    id: "T-SB-01",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "Opening mode — sensory detail produces no threads",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: ["A faint melody drifted through the stillness, half-remembered."],
    },
    assertions: [
      {
        type: "auto",
        description: "No threads created",
        check: (r: any) =>
          !r.story_bible_update?.threads || r.story_bible_update.threads.length === 0,
      },
      {
        type: "auto",
        description: "primary_thread is null",
        check: (r: any) => r.story_bible_update?.primary_thread == null,
      },
    ],
  },
  {
    id: "T-SB-02",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "Sensations not recorded as objects",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: ["A faint, familiar flavour touched the back of my tongue."],
    },
    assertions: [
      {
        type: "auto",
        description: "No sensation recorded as an object",
        check: (r: any) => noSensationsAsObjects(r.story_bible_update?.objects ?? []),
      },
    ],
  },
  {
    id: "T-SB-03",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "narrator.register captured from a committed rendering",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: ["Something nearby was cooking. My stomach made its opinion known."],
    },
    assertions: [
      {
        type: "auto",
        description: "narrator field is populated",
        check: (r: any) => r.story_bible_update?.narrator != null,
      },
      {
        type: "auto",
        description: "narrator.register is one of the valid values",
        check: (r: any) => {
          const reg = r.story_bible_update?.narrator?.register;
          return ["mundane", "literary", "uncanny", "playful"].includes(reg);
        },
      },
    ],
  },
  {
    id: "T-SB-04",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "trajectory is populated when entries are directional",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: ["The morning felt ordinary enough.", "I reached for my keys and found them missing."],
    },
    assertions: [
      {
        type: "auto",
        description: "trajectory is one of: inward, outward, relational",
        check: (r: any) => ["inward", "outward", "relational"].includes(r.story_bible_update?.trajectory),
      },
    ],
  },
  {
    id: "T-SB-05",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "opening_complete = false when only one sparse entry",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: ["Something stirred."],
    },
    assertions: [
      {
        type: "auto",
        description: "opening_complete is false",
        check: (r: any) => r.story_bible_update?.opening_complete === false,
      },
      {
        type: "auto",
        description: "missing array is not empty",
        check: (r: any) => Array.isArray(r.story_bible_update?.missing) && r.story_bible_update.missing.length > 0,
      },
    ],
  },
  {
    id: "T-SB-06",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "opening_complete = true when tone, narrator.register, and an anchor are present",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: [
        "Something nearby was cooking. My stomach made its opinion known.",
        "I reached for the window latch and felt the cold air push back.",
      ],
    },
    assertions: [
      {
        type: "auto",
        description: "opening_complete is true",
        check: (r: any) => r.story_bible_update?.opening_complete === true,
      },
    ],
  },
  {
    id: "T-SB-07",
    tag: "storyBibleOpening",
    action: "storyBibleUpdate",
    notes: "missing array correctly identifies gaps",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: { ...emptyBible, tone_established: "wistful" },
      recent_entries: ["A memory surfaced, warm and indistinct."],
    },
    assertions: [
      {
        type: "auto",
        description: "missing array is present and non-empty",
        check: (r: any) => Array.isArray(r.story_bible_update?.missing) && r.story_bible_update.missing.length > 0,
      },
      {
        type: "manual",
        description: "missing array correctly names what is absent",
        reviewPrompt:
          "Given that tone_established is already set but narrator.register and an anchor (place/object) are missing — does the missing array correctly identify these gaps? It should list something like ['narrator.register', 'places'] or similar. Does it?",
      },
    ],
  },
];

