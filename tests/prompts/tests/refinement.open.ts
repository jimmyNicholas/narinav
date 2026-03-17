import { emptyBible } from "../fixtures";
import { wordNotInRenderings, preservesPlayerVoice } from "../assertions";
import type { TestCase } from "../runner.ts";

export const refinementOpenTests: TestCase[] = [
  {
    id: "T09",
    tag: "storyBot",
    action: "refinementBot",
    notes: "bare_beat, empty bible — rendering[0] stays plain, not elevated",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: [
        "The breeze carried a faint scent, just beyond my grasp.",
      ],
      story_bible: emptyBible,
      cleaned_input: "That smells like food, and I'm hungry.",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "rendering[0] preserves the casual, plain register of the input",
        reviewPrompt:
          "Does rendering[0] sound like the player's voice — plain and direct? Or has it been elevated to literary prose ('tantalizing aroma', 'stirred my appetite with longing')? If elevated, this is a failure.",
      },
    ],
  },
  {
    id: "T10",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "bare_beat, empty bible — three renderings imply three different possible worlds",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["A sound drifted in from somewhere outside."],
      story_bible: emptyBible,
      cleaned_input: "Listen more carefully",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "Three renderings each imply a distinct genre or world — mundane, literary, uncanny",
        reviewPrompt:
          "Do the three renderings feel like they belong to three different stories? One should feel grounded and realistic, one heightened or literary, one with a hint of the strange or unresolved. Or do they all feel like the same kind of story?",
      },
    ],
  },
  {
    id: "T11",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "crafted_prose, empty bible — rendering[0] preserves player voice exactly",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["Something shifted in the air around me."],
      story_bible: emptyBible,
      cleaned_input: "The light fell across the room like a question.",
      input_type: "crafted_prose",
    },
    assertions: [
      {
        type: "auto",
        description:
          "rendering[0] preserves key words from the player's sentence",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        check: (r: any) =>
          preservesPlayerVoice(
            "The light fell across the room like a question.",
            r.renderings[0]
          ),
      },
      {
        type: "manual",
        description: "rendering[0] is a light polish — not a rewrite",
        reviewPrompt:
          "Does rendering[0] feel like the player's own sentence, lightly tidied? Or has it been significantly rewritten in a different voice?",
      },
    ],
  },
  {
    id: "T12",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "General action beat — renders as arriving at something specific, not describing the act",
    payload: {
      action: "refinementBot",
      mode: "continue",
      total_turn_count: 4,
      story_so_far: [
        "The study smelled of old paper and something faintly chemical.",
        "Marcus had left the letter on the desk.",
      ],
      story_bible: {
        ...emptyBible,
        places: [{ name: "study", description: "book-lined, dusty" }],
      },
      cleaned_input: "Explore the study",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "Renderings arrive at a specific detail — not 'I explored the study'",
        reviewPrompt:
          "Do the renderings show the narrator finding or noticing something specific (an object, a sound, a detail)? Or do they describe the act of exploring ('I began to explore', 'I searched the room')? The latter is a failure.",
      },
    ],
  },
  {
    id: "T13",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "tone_established in bible — tone word should not appear verbatim in renderings",
    payload: {
      action: "refinementBot",
      mode: "continue",
      total_turn_count: 4,
      story_so_far: [
        "A tranquil breeze stirred, softening the edges of everything.",
        "I stood still and let it move through me.",
      ],
      story_bible: { ...emptyBible, tone_established: "tranquil" },
      cleaned_input: "Walk forward slowly",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "auto",
        description:
          "Tone word 'tranquil' should NOT appear verbatim in any rendering",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        check: (r: any) => wordNotInRenderings("tranquil", r.renderings),
      },
    ],
  },
];

