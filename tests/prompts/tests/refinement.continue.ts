import { midBible } from "../fixtures";
import type { TestCase } from "../runner";

export const refinementContinueTests: TestCase[] = [
  {
    id: "T14",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "Beat contains repeated word — word should not be echoed in renderings",
    payload: {
      action: "refinementBot",
      mode: "continue",
      total_turn_count: 5,
      story_so_far: [
        "The tranquil garden stretched out before me.",
        "I moved through the tranquil space slowly.",
      ],
      story_bible: { ...midBible, tone_established: "tranquil" },
      cleaned_input: "Continue through the tranquil landscape",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "auto",
        description: "The word 'tranquil' does not appear in any rendering",
        check: (r: any) =>
          r.renderings.every(
            (s: string) => !s.toLowerCase().includes("tranquil")
          ),
      },
      {
        type: "manual",
        description:
          "Renderings translate the beat's feeling without labelling it",
        reviewPrompt:
          "Do the renderings convey peacefulness through specific sensory detail rather than by using the word 'tranquil' or synonyms like 'serene', 'peaceful', 'calm'?",
      },
    ],
  },
  {
    id: "T15",
    tag: "storyBot",
    action: "refinementBot",
    notes: "Continue mode — renderings do not restate facts already in the story",
    payload: {
      action: "refinementBot",
      mode: "continue",
      total_turn_count: 5,
      story_so_far: [
        "The study smelled of old paper.",
        "Marcus stood by the window, the letter in his hand.",
        "I asked him what it said.",
      ],
      story_bible: midBible,
      cleaned_input: "Take a step toward Marcus",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "No rendering re-describes the study or re-introduces Marcus",
        reviewPrompt:
          "Do any renderings waste words re-establishing the setting ('the dusty study', 'Marcus stood there') when the reader already knows this? Renderings should focus on the movement toward Marcus, not restate context.",
      },
    ],
  },
];

