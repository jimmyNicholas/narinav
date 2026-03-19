import type { TestCase } from "../runner";

export const classifierTests: TestCase[] = [
  {
    id: "T16",
    tag: "classifier",
    action: "classify",
    notes:
      "Plain conversational sentence — should be bare_beat not crafted_prose",
    payload: {
      action: "classify",
      raw_input: "That smells like food, and I'm hungry.",
    },
    assertions: [
      {
        type: "auto",
        description: "input_type === 'bare_beat'",
        check: (r: any) => r.input_type === "bare_beat",
      },
    ],
  },
  {
    id: "T17",
    tag: "classifier",
    action: "classify",
    notes:
      "Sentence with clear literary intention — should be crafted_prose",
    payload: {
      action: "classify",
      raw_input:
        "The light fell across the room like a question.",
    },
    assertions: [
      {
        type: "auto",
        description: "input_type === 'crafted_prose'",
        check: (r: any) => r.input_type === "crafted_prose",
      },
    ],
  },
  {
    id: "T18",
    tag: "classifier",
    action: "classify",
    notes: "Simple imperative — should be bare_beat",
    payload: {
      action: "classify",
      raw_input: "I open the door.",
    },
    assertions: [
      {
        type: "auto",
        description: "input_type === 'bare_beat'",
        check: (r: any) => r.input_type === "bare_beat",
      },
    ],
  },
  {
    id: "T19",
    tag: "classifier",
    action: "classify",
    notes: "Gibberish input — should be reframed as a narrative beat",
    payload: {
      action: "classify",
      raw_input: "sdfkjh",
    },
    assertions: [
      {
        type: "auto",
        description: "input_type === 'gibberish'",
        check: (r: any) => r.input_type === "gibberish",
      },
      {
        type: "auto",
        description: "cleaned_input is not empty and not 'sdfkjh'",
        check: (r: any) =>
          typeof r.cleaned_input === "string" &&
          r.cleaned_input.length > 0 &&
          r.cleaned_input !== "sdfkjh",
      },
    ],
  },
  {
    id: "T20",
    tag: "classifier",
    action: "classify",
    notes:
      "Input containing non-English words — should not be translated",
    payload: {
      action: "classify",
      raw_input:
        "Je ne sais pas ce qui se passe ici.",
    },
    assertions: [
      {
        type: "auto",
        description: "input_type === 'non_english'",
        check: (r: any) => r.input_type === "non_english",
      },
      {
        type: "auto",
        description:
          "cleaned_input preserves original text without translation",
        check: (r: any) =>
          typeof r.cleaned_input === "string" &&
          r.cleaned_input.includes("Je ne sais pas"),
      },
    ],
  },
];

