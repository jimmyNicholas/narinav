import { richBible } from "../fixtures";
import { beatsAreDistinct } from "../assertions";
import type { TestCase } from "../runner";

export const beatBotContinueTests: TestCase[] = [
  {
    id: "T06",
    tag: "beatBot",
    action: "beatBot",
    notes: "Continue mode — three beats are genuinely different actions",
    payload: {
      action: "beatBot",
      mode: "continue",
      total_turn_count: 5,
      story_so_far: [
        "Marcus stood in the doorway, the letter still in his hand.",
        "I asked him to put it down, but he only smiled.",
        "The study felt smaller than I remembered.",
      ],
      story_bible: richBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "auto",
        description: "Beats are meaningfully distinct",
        check: (r: any) => beatsAreDistinct(r.next_beats),
      },
      {
        type: "manual",
        description:
          "Beats represent genuinely different directions — not the same action reworded",
        reviewPrompt:
          "Could a player make a meaningfully different story choice between these three beats? Or do they all lead to the same next moment?",
      },
    ],
  },
  {
    id: "T07",
    tag: "beatBot",
    action: "beatBot",
    notes: "Continue mode — at least one beat directly answers the primary_thread",
    payload: {
      action: "beatBot",
      mode: "continue",
      total_turn_count: 5,
      story_so_far: [
        "Marcus stood in the doorway, the letter still in his hand.",
        "I asked him to put it down, but he only smiled.",
      ],
      story_bible: richBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "manual",
        description:
          "One beat directly answers 'What does the letter contain?'",
        reviewPrompt:
          "Is there a beat that would, if chosen, resolve or directly address the question 'What does the letter contain?' — e.g. reading it, grabbing it, demanding Marcus explain it?",
      },
    ],
  },
  {
    id: "T08",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Continue mode — one beat opens or deepens a secondary thread",
    payload: {
      action: "beatBot",
      mode: "continue",
      total_turn_count: 5,
      story_so_far: [
        "Marcus stood in the doorway, the letter still in his hand.",
        "I asked him to put it down, but he only smiled.",
      ],
      story_bible: richBible,
      max_turns: 15,
    },
    assertions: [
      {
        type: "manual",
        description:
          "One beat would deepen or open a thread other than the primary",
        reviewPrompt:
          "Is there a beat that engages the secondary thread ('Why has Marcus arrived unannounced?' or 'Who sent the border collie?') rather than the primary one?",
      },
    ],
  },
];

