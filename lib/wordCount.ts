/**
 * Word count validation for beat (8–18) and refinement (15–25) inputs.
 * Used client-side before submission; soft warning at limit, hard stop above max.
 */

export type WordCountResult = {
  valid: boolean;
  count: number;
  message: string;
};

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0).length;
}

export function validateWordCount(
  text: string,
  min: number,
  max: number
): WordCountResult {
  const count = countWords(text);
  if (count === 0) {
    return {
      valid: false,
      count: 0,
      message: "Enter at least one word.",
    };
  }
  if (count < min) {
    return {
      valid: false,
      count,
      message: `Use at least ${min} words (you have ${count}).`,
    };
  }
  if (count > max) {
    return {
      valid: false,
      count,
      message: `Use at most ${max} words (you have ${count}).`,
    };
  }
  const atLimit = count === max;
  return {
    valid: true,
    count,
    message: atLimit ? `${count} words (at limit).` : `${count} words`,
  };
}
