import { emptyBible } from "../fixtures";
import { beatsAreDistinct } from "../assertions";
import type { TestCase } from "../runner";

export const beatBotOpenTests: TestCase[] = [
  {
    id: "T-BO-01",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Three beats offer different trajectories (interior/active/responsive), not three atmospheric moods",
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
        description:
          "Beats are meaningfully distinct (no two share more than 2 content words)",
        check: (r: any) => beatsAreDistinct(r.next_beats),
      },
      {
        type: "manual",
        description:
          "Three beats represent interior/active/responsive — not three moods of atmosphere",
        reviewPrompt:
          "Do the three beats point in genuinely different directions? One should be inward (memory/feeling), one should involve a small action or physical detail, one should be a response to something external. Or do they all feel like variations of the same atmospheric register?",
      },
    ],
  },
  {
    id: "T-BO-02",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Each beat implies at least one of WHO/WHAT/WHERE (not pure atmosphere)",
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
        type: "manual",
        description:
          "Each beat implies at least one of: a narrator sensibility, an action, or an implied space",
        reviewPrompt:
          "For each beat, can you answer at least one of: Who is the narrator? What are they doing? Where might they be? If a beat implies none of these — just atmosphere — it fails.",
      },
    ],
  },
  {
    id: "T-BO-03",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "At least one beat creates forward pull (hook), not just orientation",
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
        type: "manual",
        description:
          "At least one beat makes the player want to know what happens next — not just establishes mood",
        reviewPrompt:
          "Is there a beat that creates a question or implies something is about to happen? Or do all three just establish a feeling without any forward pull? At least one must be a hook.",
      },
    ],
  },
  {
    id: "T-BO-04",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "No beat locks in a named place the bible does not confirm",
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
        description: "No spatial words that commit to a specific named location",
        check: (r: any) =>
          (() => {
            const named = [
              "kitchen",
              "bedroom",
              "office",
              "hospital",
              "school",
              "london",
              "new york",
              "paris",
              "forest",
              "beach",
            ];
            const text = String(r.next_beats?.join(" ") ?? "").toLowerCase();
            return !named.some((w) => text.includes(w));
          })(),
      },
    ],
  },
  {
    id: "T-BO-05",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Open mode with a primary_thread set — beats must NOT chase it",
    payload: {
      action: "beatBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["Something stirred at the edge of awareness."],
      story_bible: {
        ...emptyBible,
        threads: [{ text: "What is the source of the melody?", status: "new" }],
        primary_thread: "What is the source of the melody?",
      },
      max_turns: 15,
    },
    assertions: [
      {
        type: "manual",
        description:
          "No beat investigates, follows, or references the melody thread",
        reviewPrompt:
          "Do any beats involve finding, following, or investigating the melody? Direct OR indirect reference is a failure. The beats should ignore the thread entirely and offer different directions.",
      },
    ],
  },
  {
    id: "T-BO-06",
    tag: "beatBot",
    action: "beatBot",
    notes:
      "Beats are specific enough to yes-and without extra setup",
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
        type: "manual",
        description:
          "Each beat gives enough to work with — not so vague it could mean anything",
        reviewPrompt:
          "For each beat: if you were improvising, could you immediately continue the scene from this beat? Or is it so abstract you'd have to invent everything yourself? 'The air shifts' fails — too abstract. 'Your hand reaches for something' passes — specific enough to follow.",
      },
    ],
  },
];

