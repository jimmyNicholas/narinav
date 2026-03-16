/**
 * Navinav bot prompts. Re-exports from beatBot, storyBot, storyBible.
 */

export {
  getBeatBotSystem,
  beatBotUser,
  type BeatBotMode,
} from "./beatBot";

export {
  INPUT_CLASSIFIER_SYSTEM,
  inputClassifierUser,
  getRefinementSystem,
  refinementBotUser,
  FINAL_STORY_BOT_SYSTEM,
  finalStoryBotUser,
  type RefinementMode,
} from "./storyBot";

export {
  STORY_BIBLE_UPDATE_SYSTEM,
  storyBibleUpdateUser,
} from "./storyBible";
