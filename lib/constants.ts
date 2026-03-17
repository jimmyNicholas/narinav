/**
 * Navinav game constants. Single source of truth for client and server.
 */

export const MAX_TURNS = 20;
export const DECISION_MOMENT_1 = 0.6;
export const DECISION_MOMENT_2 = 0.8;
export const ENDING_TURNS = 5;
export const CONTINUE_TURNS = 8;
export const OPENING_TURNS = 3;
export const CONTEXT_SWITCH_TURN = 8;
export const AGENCY_LOCK_THRESHOLD = 2;

export const BEAT_WORD_MIN = 8;
export const BEAT_WORD_MAX = 18;
export const REFINE_WORD_MIN = 15;
export const REFINE_WORD_MAX = 25;
/** Max words for the moral (ending bot). */
export const MORAL_WORD_MAX = 20;

/** Dev mode model (all bots when dev mode is on). */
export const DEV_MODE_MODEL = "claude-3-haiku-20240307";

/** Production models (when dev mode is off). */
export const PRODUCTION_GAME_MODEL = "claude-3-5-haiku-20241022";
export const PRODUCTION_FINAL_STORY_MODEL = "claude-sonnet-4-20250514";
