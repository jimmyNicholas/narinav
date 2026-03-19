import { emptyBible } from "../fixtures";
import { wordNotInRenderings, preservesPlayerVoice } from "../assertions";
import type { TestCase } from "../runner.ts";

type RefinementResponse = { renderings: [string, string, string] };

export const refinementOpenTests: TestCase[] = [
  {
    id: "T-RO-01",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "Rendering [0] is mundane-realist — specific narrator, plain language, grounded",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: [
        "The breeze carried a faint scent, just beyond my grasp.",
      ],
      story_bible: emptyBible,
      cleaned_input: "That smells like food, and I'm hungry.",
      input_type: "crafted_prose",
    },
    assertions: [
      {
        type: "auto",
        description:
          "Rendering [0] preserves player's key words (not a rewrite)",
        check: (r: unknown) =>
          preservesPlayerVoice(
            "That smells like food, and I'm hungry.",
            (r as RefinementResponse).renderings[0]
          ),
      },
      {
        type: "manual",
        description:
          "Rendering [0] reads like a memoir opening — specific, plain, grounded in the physical",
        reviewPrompt:
          "Does rendering [0] preserve the player's voice — plain and direct, close to their exact words? The player wrote 'That smells like food, and I'm hungry.' — rendering [0] should keep that register and those words. 'That smells like food — and right now I was very hungry.' = pass. 'A tantalizing aroma stirred my appetite with longing.' = fail (voice erased).",
      },
    ],
  },
  {
    id: "T-RO-02",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "Rendering [1] reads like literary fiction — emotional weight, considered language",
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
          "Rendering [1] reads like literary fiction — considered language, emotional weight",
        reviewPrompt:
          "Does rendering [1] feel like it could open a literary short story? It should have considered language where each word earns its place, and carry emotional significance beyond what the words literally say. It should NOT just be rendering [0] with fancier words. 'The sound arrived in fragments, each one pulling me further from myself.' = pass. 'The faint noise drew my attention, teasing my senses.' = fail (elevated vocabulary but no weight).",
      },
    ],
  },
  {
    id: "T-RO-05",
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
        description:
          "Rendering [0] preserves the metaphor 'like a question' — not replaced",
        reviewPrompt:
          "Does rendering [0] keep the phrase 'like a question' (or a very close variant) intact? The player's specific metaphor must survive. 'The light fell across the room like an unanswered question.' = pass. 'The light draped itself across the room...' = fail (metaphor replaced).",
      },
    ],
  },
  {
    id: "T-RO-03",
    tag: "storyBot",
    action: "refinementBot",
    notes:
      "Rendering [2] is genuinely uncanny — one concrete wrong detail, not atmosphere",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["The morning felt ordinary, until it didn't."],
      story_bible: emptyBible,
      cleaned_input: "Check what time it is",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "Rendering [2] contains one element that doesn't quite add up — the world is slightly wrong",
        reviewPrompt:
          "Does rendering [2] contain one specific concrete detail that is wrong — not just an eerie atmosphere? The narrator notices it without alarm or explanation. e.g. 'The clock read 3pm. It had read 3pm for a while now.' = pass (specific wrongness stated plainly). 'An unsettling quiet gathered around me.' = fail (atmosphere, no concrete wrongness). 'Something felt off, though I couldn't name it.' = fail (describes the feeling of wrongness, not the wrongness itself).",
      },
    ],
  },
  {
    id: "T-RO-04",
    tag: "storyBot",
    action: "refinementBot",
    notes: "All three renderings feel like different story universes (three worlds, not three tones)",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["Something was waiting on the other side."],
      story_bible: emptyBible,
      cleaned_input: "Open the door",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "Three renderings feel like they come from three different books",
        reviewPrompt:
          "Could each rendering credibly open a different kind of book? [0] a memoir or contemporary fiction, [1] a literary short story collection, [2] a speculative or weird fiction anthology? Or do they all feel like they come from the same book, just written differently?",
      },
    ],
  },
  {
    id: "T-RO-06",
    tag: "storyBot",
    action: "refinementBot",
    notes: "bare_beat — rendering [0] is grounded, not elevated",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["The breeze carried a faint scent."],
      story_bible: emptyBible,
      cleaned_input: "Follow the smell",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "manual",
        description:
          "Rendering [0] uses plain language grounded in physical action — not elevated prose",
        reviewPrompt:
          "Is rendering [0] grounded in a specific physical action or observable detail, using plain everyday language? 'I followed my nose toward the smell' = pass. 'The elusive fragrance beckoned me onward' = fail (elevated, not grounded).",
      },
    ],
  },
  {
    id: "T-RO-07",
    tag: "storyBot",
    action: "refinementBot",
    notes: "All renderings are one sentence only",
    payload: {
      action: "refinementBot",
      mode: "open",
      total_turn_count: 1,
      story_so_far: ["Something stirred at the edge of my awareness."],
      story_bible: emptyBible,
      cleaned_input: "Turn toward it",
      input_type: "bare_beat",
    },
    assertions: [
      {
        type: "auto",
        description: "Each rendering contains exactly one sentence",
        check: (r: unknown) =>
          (r as RefinementResponse).renderings.every((s: string) => {
            const endings = (s.match(/[.!?]/g) || []).length;
            return endings === 1;
          }),
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

