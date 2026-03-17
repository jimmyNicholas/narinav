import { emptyBible, openingBible } from "../fixtures";
import {
  noSpatialCommitment,
  noAssumedCharacter,
  beatsAreDistinct,
} from "../assertions";
import type { TestCase } from "../runner";

export const beatBotOpenTests: TestCase[] = [
  {
    id: "T01",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode, empty bible — no beat should commit to a specific location",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 0,
      story_so_far: [],
      story_bible: emptyBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "auto",
        description: "No spatial words in any beat",
        check: (r: any) =>
          r.next_beats.every((b: string) => noSpatialCommitment(b)),
      },
    ],
  },
  {
    id: "T02",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode, empty bible — three beats vary across sensation/internal/action",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 0,
      story_so_far: [],
      story_bible: emptyBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "auto",
        description: "Beats are meaningfully distinct from each other",
        check: (r: any) => beatsAreDistinct(r.next_beats),
      },
      {
        type: "manual",
        description:
          "Beats cover sensation, internal, and micro-action registers",
        reviewPrompt:
          "Do the three beats feel like different types of action — one perceptual, one internal/memory, one small physical action? Or do they all feel like the same kind of thing?",
      },
    ],
  },
  {
    id: "T03",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode, one confirmed place — beats stay within implied spatial boundary",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["The bedroom was quiet, the sheets still warm."],
      story_bible: openingBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "manual",
        description:
          "Beats feel grounded near the bedroom — no teleporting to unrelated spaces",
        reviewPrompt:
          "Do the beats feel spatially coherent with a bedroom setting, without naming rooms that haven't been established (e.g. suddenly a kitchen, a street)?",
      },
    ],
  },
  {
    id: "T04",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode, primary_thread set — beats should NOT chase the thread",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["A faint melody drifted through the stillness."],
      story_bible: {
        ...emptyBible,
        threads: [
          { text: "What is the source of the melody?", status: "new" },
        ],
        primary_thread: "What is the source of the melody?",
      },
      max_turns: 15,
    },
    assertions: [
      {
        type: "manual",
        description:
          "No beat investigates, chases, or resolves the thread",
        reviewPrompt:
          "Do any of the three beats involve finding, investigating, or following the melody? If yes, this is a failure — open mode beats should not chase threads.",
      },
    ],
  },
  {
    id: "T05",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode, no confirmed characters — no beat assumes a character is present",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 0,
      story_so_far: [],
      story_bible: emptyBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "auto",
        description: "No assumed character pronouns or presence in any beat",
        check: (r: any) =>
          r.next_beats.every((b: string) => noAssumedCharacter(b)),
      },
    ],
  },
];

