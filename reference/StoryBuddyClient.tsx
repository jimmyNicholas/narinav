"use client";

import React, { useRef, useState } from "react";
import Script from "next/script";
import { StoryPayload } from "./storyBuddyUtils";
import { useStoryBuddyVoiceflow } from "./useStoryBuddyVoiceflow";
import { useStoryBuddyShortcuts } from "./useStoryBuddyShortcuts";
import { getStoryBuddyViewState } from "./useStoryBuddyViewState";
import {
  FinalStoryPanel,
  MessagePanel,
  OptionsPanel,
  StoryBuddyConnecting,
  StorySoFarPanel,
  WelcomeOverlay,
} from "./StoryBuddyPanels";

const VOICEFLOW_SCRIPT_URL =
  "https://cdn.voiceflow.com/widget-next/bundle.mjs";

export default function StoryBuddyClient() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [payload, setPayload] = useState<StoryPayload | null>(null);
  const [customInputValue, setCustomInputValue] = useState("");
  // Persist last non-empty choices so buttons don't disappear on payloads without choices
  const [choicesState, setChoicesState] = useState<string[]>([]);
  // Persist last non-empty story/message so UI doesn't reset on empty payloads
  const [storySoFarState, setStorySoFarState] = useState("");
  const [messageToPlayerState, setMessageToPlayerState] = useState("");
  const [finalTitleState, setFinalTitleState] = useState("");
  const [finalStoryState, setFinalStoryState] = useState("");
  const [isWaitingForPayload, setIsWaitingForPayload] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [gameReady, setGameReady] = useState(false);

  const targetRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleChoiceClick = (index: number, choiceText: string) => {
    const interact =
      (window as {
        voiceflow?: { chat?: { interact?: (payload: unknown) => void } };
      }).voiceflow?.chat?.interact;
    if (typeof interact !== "function") return;
    setIsWaitingForPayload(true);
    interact({
      type: "choice_selected",
      payload: {
        choice_index: String(index),
        choice_text: choiceText,
        is_custom: false,
      },
    });
  };

  const handleCustomSubmit = () => {
    const text = customInputValue.trim();
    const interact =
      (window as {
        voiceflow?: { chat?: { interact?: (payload: unknown) => void } };
      }).voiceflow?.chat?.interact;
    if (!text || typeof interact !== "function") return;
    setIsWaitingForPayload(true);
    interact({
      type: "custom_input",
      payload: {
        choice_text: text,
        is_custom: true,
      },
    });
    setCustomInputValue("");
  };

  const viewState = getStoryBuddyViewState({
    storySoFarState,
    messageToPlayerState,
    finalTitleState,
    finalStoryState,
    payload,
    choicesState,
  });

  useStoryBuddyVoiceflow({
    scriptLoaded,
    showWelcome,
    hasInitialContent: viewState.hasInitialContent,
    targetRef,
    setPayload,
    setChoicesState,
    setStorySoFarState,
    setMessageToPlayerState,
    setFinalTitleState,
    setFinalStoryState,
    setIsWaitingForPayload,
    onStartSignal: () => setShowWelcome(false),
    onEmbedReady: () => setGameReady(true),
  });

  const focusCustomInput = () => {
    customInputRef.current?.focus();
  };

  useStoryBuddyShortcuts({
    choicesList: viewState.choicesList,
    isWaitingForPayload,
    onChoiceSelected: handleChoiceClick,
    focusCustomInput,
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
      <Script
        src={VOICEFLOW_SCRIPT_URL}
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />
      {/* Overlay always mounted so embed slot ref is stable; hidden when not welcome */}
      <div
        className="min-h-[420px]"
        style={{ display: showWelcome ? "block" : "none" }}
        aria-hidden={!showWelcome}
      >
        <WelcomeOverlay
          gameReady={gameReady}
          embedTargetRef={targetRef}
          onStart={() => {
            setShowWelcome(false);
            const interact =
              (window as {
                voiceflow?: { chat?: { interact?: (payload: unknown) => void } };
              }).voiceflow?.chat?.interact;
            if (typeof interact === "function") {
              interact({
                type: "custom_input",
                payload: { start_signal: "true", is_custom: true },
              });
            }
          }}
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
              <StorySoFarPanel storySoFar={storySoFar} />
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

      {/* <div
        className="mt-6 border-2 border-secondary rounded-3xl p-4"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--palette-background) 95%, var(--palette-secondary) 5%)",
        }}
      >
        <h3 className="font-mono font-bold text-themed text-sm mb-2">
          Debug – payload
        </h3>
        <p className="text-accent/70 text-xs font-mono mb-2">
          Only seeing two payloads? In DevTools Console run{" "}
          <code className="text-accent">
            localStorage.setItem(&quot;VF_STORY_BUDDY_TRACE_DEBUG&quot;,&quot;1&quot;)
          </code>{" "}
          then reload — every trace type will log so you can see if the custom
          action stops firing after turn 2.
        </p>
        <pre className="text-accent text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
          {payload != null ? JSON.stringify(payload, null, 2) : "—"}
        </pre>
      </div> */}

    </>
  );
}
