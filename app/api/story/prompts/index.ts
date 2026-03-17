/**
 * Navinav bot prompts. Re-exports from beatBot, storyBot, storyBible.
 */

export {
  getBeatBotSystem,
  beatBotUser,
  type BeatBotMode,
} from "./beatBot";

export {
  getRefinementSystem,
  refinementBotUser,
  FINAL_STORY_BOT_SYSTEM,
  finalStoryBotUser,
  type RefinementMode,
} from "./refinementBot";

export { INPUT_CLASSIFIER_SYSTEM, inputClassifierUser } from "./inputClassifier";

export {
  STORY_BIBLE_UPDATE_SYSTEM_OPENING,
  STORY_BIBLE_UPDATE_SYSTEM,
  storyBibleUpdateUser,
} from "./storyBible";
