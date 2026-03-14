import { StoryPayload, normalizeChoices, payloadHasUnresolvedPlaceholders, resolveMessageToPlayer } from "./storyBuddyUtils";

type UseStoryBuddyViewStateInput = {
  storySoFarState: string;
  messageToPlayerState: string;
  finalTitleState: string;
  finalStoryState: string;
  payload: StoryPayload | null;
  choicesState: string[];
};

export type StoryBuddyViewState = {
  storySoFar: string;
  messageToPlayer: string;
  finalTitle: string;
  finalStory: string;
  hasFinalStory: boolean;
  choicesList: string[];
  hasPlaceholderIssue: boolean;
  allowCustomInput: boolean;
  hasInitialContent: boolean;
};

export function getStoryBuddyViewState({
  storySoFarState,
  messageToPlayerState,
  finalTitleState,
  finalStoryState,
  payload,
  choicesState,
}: UseStoryBuddyViewStateInput): StoryBuddyViewState {
  const storySoFar = storySoFarState.trimEnd();
  const messageToPlayer = resolveMessageToPlayer(messageToPlayerState);
  const finalTitle = finalTitleState.trim();
  const finalStory = finalStoryState
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  const isEmptyFinalTitle = finalTitle.length === 0 || finalTitle === "0";
  const isEmptyFinalStory = finalStory.length === 0 || finalStory === "0";
  const hasFinalStory = !isEmptyFinalTitle || !isEmptyFinalStory;

  const choicesFromPayload = payload != null ? normalizeChoices(payload) : [];
  const choicesList =
    choicesFromPayload.length > 0 ? choicesFromPayload : choicesState;

  const hasPlaceholderIssue =
    payload != null && payloadHasUnresolvedPlaceholders(payload);

  const allowCustomInput = payload?.allow_custom_input !== false;

  const hasInitialContent =
    hasFinalStory ||
    storySoFar.length > 0 ||
    messageToPlayer.length > 0 ||
    choicesList.length > 0;

  return {
    storySoFar,
    messageToPlayer,
    finalTitle,
    finalStory,
    hasFinalStory,
    choicesList,
    hasPlaceholderIssue,
    allowCustomInput,
    hasInitialContent,
  };
}

