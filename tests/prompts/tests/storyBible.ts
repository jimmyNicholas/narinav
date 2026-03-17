import { emptyBible } from "../fixtures";
import { noSensationsAsObjects } from "../assertions";
import type { TestCase } from "../runner";

export const storyBibleTests: TestCase[] = [
  {
    id: "T21",
    tag: "storyBible",
    action: "storyBibleUpdate",
    notes: "Opening mode — sensory detail should not produce threads",
    payload: {
      action: "storyBibleUpdate",
      mode: "open",
      current_bible: emptyBible,
      recent_entries: [
        "A faint melody drifted through the stillness, half-remembered.",
      ],
    },
    assertions: [
      {
        type: "auto",
        description: "No threads created",
        check: (r: any) => {
          const update = r.story_bible_update;
          return !update?.threads || update.threads.length === 0;
        },
      },
      {
        type: "auto",
        description: "primary_thread is null",
        check: (r: any) => {
          const update = r.story_bible_update;
          return (
            update?.primary_thread === null ||
            update?.primary_thread === undefined
          );
        },
      },
    ],
  },
  {
    id: "T22",
    tag: "storyBible",
    action: "storyBibleUpdate",
    notes:
      "Vague object identified in next entry — only one object should remain",
    payload: {
      action: "storyBibleUpdate",
      mode: "continue",
      current_bible: {
        ...emptyBible,
        objects: [
          {
            name: "unknown object",
            significance: "texture unfamiliar yet intriguing",
          },
        ],
      },
      recent_entries: [
        "My fingertips traced the contours of the unknown object.",
        "The tennis ball, neon yellow and fuzzy, lay amidst the rumpled sheets.",
      ],
    },
    assertions: [
      {
        type: "auto",
        description:
          "Only one object in the updated bible — not both 'unknown object' and 'tennis ball'",
        check: (r: any) => {
          const objects = r.story_bible_update?.objects;
          if (!objects) return true;
          return objects.length === 1;
        },
      },
      {
        type: "auto",
        description:
          "The remaining object is 'tennis ball', not 'unknown object'",
        check: (r: any) => {
          const objects = r.story_bible_update?.objects;
          if (!objects || objects.length === 0) return false;
          return objects[0].name?.toLowerCase().includes("tennis ball");
        },
      },
    ],
  },
  {
    id: "T23",
    tag: "storyBible",
    action: "storyBibleUpdate",
    notes:
      "Character acts dramatically — should appear in characters AND generate a thread",
    payload: {
      action: "storyBibleUpdate",
      mode: "continue",
      current_bible: emptyBible,
      recent_entries: [
        "I tossed the ball lightly into the air.",
        "Seemingly out of nowhere, a border collie leapt and caught it mid-flight.",
      ],
    },
    assertions: [
      {
        type: "auto",
        description: "Border collie added to characters array",
        check: (r: any) => {
          const chars = r.story_bible_update?.characters;
          if (!chars) return false;
          return chars.some((c: any) => {
            const name = (c.name ?? "").toLowerCase();
            return name.includes("border collie") || name.includes("dog");
          });
        },
      },
      {
        type: "auto",
        description: "A thread about the dog's origin is created",
        check: (r: any) => {
          const threads = r.story_bible_update?.threads;
          if (!threads) return false;
          return threads.some((t: any) => {
            const text = (t.text ?? "").toLowerCase();
            return (
              text.includes("collie") ||
              text.includes("dog") ||
              text.includes("where") ||
              text.includes("who")
            );
          });
        },
      },
    ],
  },
  {
    id: "T24",
    tag: "storyBible",
    action: "storyBibleUpdate",
    notes: "Sensation should not be recorded as an object",
    payload: {
      action: "storyBibleUpdate",
      mode: "continue",
      current_bible: emptyBible,
      recent_entries: [
        "A faint, familiar flavour touched the back of my tongue, stirring vague memories.",
      ],
    },
    assertions: [
      {
        type: "auto",
        description:
          "No sensation (taste, smell, sound) recorded as an object",
        check: (r: any) => {
          const objects = r.story_bible_update?.objects ?? [];
          return noSensationsAsObjects(objects);
        },
      },
    ],
  },
];

