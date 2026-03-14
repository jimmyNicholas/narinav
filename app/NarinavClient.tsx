"use client";

import React, { useRef, useState } from "react";
import type { StoryPayload } from "@/reference/storyBuddyUtils";
import { coerceStorySoFar } from "@/reference/storyBuddyUtils";
import { getStoryBuddyViewState } from "@/reference/useStoryBuddyViewState";
import { useStoryBuddyShortcuts } from "@/reference/useStoryBuddyShortcuts";
import {
  FinalStoryPanel,
  MessagePanel,
  OptionsPanel,
  StoryBuddyConnecting,
  StorySoFarPanel,
  WelcomeOverlay,
} from "@/reference/StoryBuddyPanels";
import {
  defaultNarinavOptions,
  type NarinavOptions,
} from "./NarinavOptionsPanel";

async function fetchStoryPayload(
  action: "start" | "choice",
  options: {
    shortSentencesOnly?: boolean;
    shortSentenceMinWords?: number;
    shortSentenceMaxWords?: number;
    usePlayerWordsWhenPossible?: boolean;
  },
  choice?: string,
  storySoFar?: string,
  messageToPlayer?: string
): Promise<StoryPayload> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      choice,
      storySoFar,
      messageToPlayer,
      options: {
        shortSentencesOnly: options.shortSentencesOnly || undefined,
        shortSentenceMinWords:
          options.shortSentencesOnly && options.shortSentenceMinWords != null
            ? options.shortSentenceMinWords
            : undefined,
        shortSentenceMaxWords:
          options.shortSentencesOnly && options.shortSentenceMaxWords != null
            ? options.shortSentenceMaxWords
            : undefined,
        usePlayerWordsWhenPossible: options.usePlayerWordsWhenPossible || undefined,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  if (!data.payload) throw new Error("No payload in response");
  return data.payload as StoryPayload;
}

type NarinavClientProps = {
  options?: NarinavOptions | null;
};

export default function NarinavClient({ options: optionsProp }: NarinavClientProps) {
  const options = optionsProp ?? defaultNarinavOptions;

  const [payload, setPayload] = useState<StoryPayload | null>(null);
  const [customInputValue, setCustomInputValue] = useState("");
  const [choicesState, setChoicesState] = useState<string[]>([]);
  const [storySoFarState, setStorySoFarState] = useState("");
  const [messageToPlayerState, setMessageToPlayerState] = useState("");
  const [finalTitleState, setFinalTitleState] = useState("");
  const [finalStoryState, setFinalStoryState] = useState("");
  const [turnCount, setTurnCount] = useState<number>(0);
  const [isWaitingForPayload, setIsWaitingForPayload] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const customInputRef = useRef<HTMLInputElement>(null);

  const maxTurns = Math.min(30, Math.max(5, options.maxTurns));
  const atMaxTurns = turnCount >= maxTurns;

  const viewState = getStoryBuddyViewState({
    storySoFarState,
    messageToPlayerState,
    finalTitleState,
    finalStoryState,
    payload,
    choicesState,
  });

  const handleChoiceClick = async (index: number, choiceText: string) => {
    if (atMaxTurns) return;
    setIsWaitingForPayload(true);
    try {
      const next = await fetchStoryPayload(
        "choice",
        options,
        choiceText,
        storySoFarState,
        messageToPlayerState
      );
      setPayload(next);
      const nextStoryText = coerceStorySoFar(next.story_so_far);
      setStorySoFarState(nextStoryText || storySoFarState);
      setMessageToPlayerState(String(next.message_to_player ?? ""));
      const choices =
        next.choices?.filter((c): c is string => typeof c === "string") ??
        [next.choice_a, next.choice_b, next.choice_c].filter(
          (c): c is string => typeof c === "string"
        );
      setChoicesState(choices);
      setTurnCount((t) => t + 1);
      if (next.final_title || next.final_story) {
        setFinalTitleState(String(next.final_title ?? ""));
        setFinalStoryState(String(next.final_story ?? ""));
      } else if (turnCount + 1 >= maxTurns) {
        setFinalTitleState(String(next.final_title ?? "The End"));
        setFinalStoryState(nextStoryText || storySoFarState);
      }
    } catch (err) {
      console.error(err);
      setMessageToPlayerState(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsWaitingForPayload(false);
    }
  };

  const handleCustomSubmit = async () => {
    const text = customInputValue.trim();
    if (!text || atMaxTurns) return;
    setCustomInputValue("");
    setIsWaitingForPayload(true);
    try {
      const next = await fetchStoryPayload(
        "choice",
        options,
        text,
        storySoFarState,
        messageToPlayerState
      );
      setPayload(next);
      const nextStoryText = coerceStorySoFar(next.story_so_far);
      setStorySoFarState(nextStoryText || storySoFarState);
      setMessageToPlayerState(String(next.message_to_player ?? ""));
      const choices =
        next.choices?.filter((c): c is string => typeof c === "string") ??
        [next.choice_a, next.choice_b, next.choice_c].filter(
          (c): c is string => typeof c === "string"
        );
      setChoicesState(choices);
      setTurnCount((t) => t + 1);
      if (next.final_title || next.final_story) {
        setFinalTitleState(String(next.final_title ?? ""));
        setFinalStoryState(String(next.final_story ?? ""));
      } else if (turnCount + 1 >= maxTurns) {
        setFinalTitleState(String(next.final_title ?? "The End"));
        setFinalStoryState(nextStoryText || storySoFarState);
      }
    } catch (err) {
      console.error(err);
      setMessageToPlayerState(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsWaitingForPayload(false);
    }
  };

  const handleStart = async () => {
    setShowWelcome(false);
    setIsWaitingForPayload(true);
    try {
      const next = await fetchStoryPayload("start", options);
      setPayload(next);
      setStorySoFarState(coerceStorySoFar(next.story_so_far));
      setMessageToPlayerState(String(next.message_to_player ?? ""));
      setTurnCount(1);
      const choices =
        next.choices?.filter((c): c is string => typeof c === "string") ??
        [next.choice_a, next.choice_b, next.choice_c].filter(
          (c): c is string => typeof c === "string"
        );
      setChoicesState(choices);
      if (next.final_title || next.final_story) {
        setFinalTitleState(String(next.final_title ?? ""));
        setFinalStoryState(String(next.final_story ?? ""));
      }
    } catch (err) {
      console.error(err);
      setShowWelcome(true);
      setMessageToPlayerState(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setIsWaitingForPayload(false);
    }
  };

  useStoryBuddyShortcuts({
    choicesList: viewState.choicesList,
    isWaitingForPayload,
    onChoiceSelected: handleChoiceClick,
    focusCustomInput: () => customInputRef.current?.focus(),
  });

  const {
    storySoFar,
    messageToPlayer,
    finalTitle,
    finalStory,
    hasFinalStory,
    choicesList,
    hasPlaceholderIssue,
    allowCustomInput,
    hasInitialContent,
  } = viewState;

  return (
    <>
      <div
        className="min-h-[420px]"
        style={{ display: showWelcome ? "block" : "none" }}
        aria-hidden={!showWelcome}
      >
        <WelcomeOverlay
          gameReady={true}
          onStart={handleStart}
        />
      </div>
      {!showWelcome && !hasInitialContent ? (
        <StoryBuddyConnecting />
      ) : !showWelcome && hasInitialContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[420px]">
          {hasFinalStory ? (
            <FinalStoryPanel finalTitle={finalTitle} finalStory={finalStory} />
          ) : (
            <>
              <StorySoFarPanel storySoFar={storySoFar} turnCount={turnCount} />
              <div className="flex flex-col gap-4 min-h-[500px]">
                <MessagePanel
                  messageToPlayer={messageToPlayer}
                  hasPlaceholderIssue={hasPlaceholderIssue}
                />
                <OptionsPanel
                  choicesList={choicesList}
                  allowCustomInput={allowCustomInput}
                  isWaitingForPayload={isWaitingForPayload}
                  customInputValue={customInputValue}
                  onCustomInputChange={setCustomInputValue}
                  onCustomSubmit={handleCustomSubmit}
                  onChoiceClick={handleChoiceClick}
                  customInputRef={customInputRef}
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
