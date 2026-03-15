"use client";

import React from "react";
import {
  Panel,
  MessageBlock,
  Bubble,
  PrimaryButton,
  SecondaryButton,
  getCardBg,
  PANEL_BG,
} from "./NarnavUI";

/** Parse story text into display segments (paragraphs). */
function parseStoryLines(story: string): string[] {
  return String(story ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\*\s*/, "").trim())
    .filter(Boolean);
}

type FinalStoryPanelProps = {
  finalTitle: string;
  finalStory: string;
};

export function FinalStoryPanel({ finalTitle, finalStory }: FinalStoryPanelProps) {
  return (
    <Panel
      as="section"
      variant="soft"
      className="lg:col-span-2 border-2 border-secondary rounded-3xl p-6 flex flex-col min-h-[320px]"
      aria-label="Final story"
    >
      <h2 className="font-mono font-bold text-themed text-lg mb-3">
        Final story
      </h2>
      {finalTitle && (
        <h3 className="font-mono text-primary text-base mb-3">
          {finalTitle}
        </h3>
      )}
      <div className="text-themed text-sm leading-relaxed flex-1 overflow-y-auto whitespace-pre-line font-mono">
        {finalStory || "(No final story provided.)"}
      </div>
    </Panel>
  );
}

type StorySoFarPanelProps = {
  storySoFar: string;
  turnCount?: number;
  selectedBeat?: string | null;
  onRemoveBeat?: () => void;
  canRemoveBeat?: boolean;
};

export function StorySoFarPanel({
  storySoFar,
  turnCount,
  selectedBeat,
  onRemoveBeat,
  canRemoveBeat,
}: StorySoFarPanelProps) {
  return (
    <section
      className="border-[3px] border-primary rounded-3xl p-6 flex flex-col min-h-[500px] max-h-[560px] overflow-hidden"
      aria-label="Story so far"
      style={{ backgroundColor: PANEL_BG.default }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-mono font-bold text-themed text-lg shrink-0">
          Story so far
        </h2>
        <span
          className="font-mono text-secondary text-sm shrink-0"
          aria-label={turnCount != null ? `Turn ${turnCount}` : undefined}
        >
          {turnCount != null && turnCount > 0 ? `Turn ${turnCount}` : "—"}
        </span>
      </div>
      <div
        className="text-themed text-base leading-relaxed flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {storySoFar ? (
          <ul className="space-y-3 pl-5 list-disc marker:text-primary">
            {parseStoryLines(storySoFar).map((paragraph, i) => (
              <li key={i}>{paragraph}</li>
            ))}
          </ul>
        ) : (
          <span className="text-secondary/80">
            Your story will go here...
          </span>
        )}
        {selectedBeat && selectedBeat.trim() && (
          <div className="mt-3 flex flex-col gap-2">
            <Bubble>{selectedBeat}</Bubble>
            {canRemoveBeat && onRemoveBeat && (
              <SecondaryButton onClick={onRemoveBeat} className="self-start py-1.5">
                Remove this beat — back to choices
              </SecondaryButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type OptionsPanelProps = {
  choicesList: string[];
  allowCustomInput: boolean;
  isWaitingForPayload: boolean;
  customInputValue: string;
  onCustomInputChange: (value: string) => void;
  onCustomSubmit: () => void;
  onChoiceClick: (index: number, choiceText: string) => void;
  customInputRef: React.RefObject<HTMLInputElement | null>;
};

export function OptionsPanel({
  choicesList,
  allowCustomInput,
  isWaitingForPayload,
  customInputValue,
  onCustomInputChange,
  onCustomSubmit,
  onChoiceClick,
  customInputRef,
}: OptionsPanelProps) {
  return (
    <section
      className="relative border-2 border-secondary rounded-3xl p-4 flex flex-col gap-3 flex-1 min-h-0"
      aria-label="Choose what happens next"
      aria-busy={isWaitingForPayload ? "true" : "false"}
      style={{ backgroundColor: PANEL_BG.default }}
    >
      {isWaitingForPayload && (
        <div
          className="absolute inset-0 z-10 rounded-3xl bg-(--palette-background)/80 backdrop-blur-[1px] flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 px-5 py-4 border-2 border-secondary rounded-2xl bg-(--palette-background)/80">
            <span
              className="inline-block h-8 w-8 rounded-full border-4 border-accent/40 border-t-primary animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <div className="text-secondary text-sm font-mono">
              Thinking about your story…
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 flex-1 min-h-0 auto-rows-fr">
        {[0, 1, 2].map((i) => {
          const choice = choicesList[i] ?? "";
          const hasChoice = choice.length > 0;
          return (
            <button
              key={`choice-${i}-${choice.slice(0, 48)}`}
              type="button"
              disabled={!hasChoice || isWaitingForPayload}
              className="h-full w-full text-left px-4 py-3 border-2 border-primary rounded-2xl text-themed text-base leading-relaxed font-mono transition-all duration-200 motion-reduce:transition-none enabled:cursor-pointer hover:bg-(--palette-primary)/14 hover:shadow-md hover:shadow-black/10 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:border-primary active:translate-y-0 active:scale-[0.99] motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--palette-background) disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100"
              style={{ backgroundColor: getCardBg() }}
              onClick={() =>
                hasChoice && !isWaitingForPayload && onChoiceClick(i, choice)
              }
            >
              {hasChoice ? choice : "—"}
            </button>
          );
        })}
      </div>

      {allowCustomInput ? (
        <div className="flex flex-col sm:flex-row gap-2 pt-1 shrink-0">
          <label className="sr-only" htmlFor="narinav-custom-input">
            Or type your own action
          </label>
          <input
            id="narinav-custom-input"
            ref={customInputRef}
            type="text"
            value={customInputValue}
            onChange={(e) => onCustomInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCustomSubmit()}
            disabled={isWaitingForPayload}
            placeholder="Or type your own action..."
            className="w-full px-3 py-2 border-2 border-secondary rounded-2xl text-themed text-base font-mono bg-transparent placeholder:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--palette-background)"
          />
          <PrimaryButton
            onClick={onCustomSubmit}
            disabled={isWaitingForPayload || !customInputValue.trim()}
            aria-label="Submit your story action"
            className="sm:w-32"
          >
            Submit
          </PrimaryButton>
        </div>
      ) : null}
    </section>
  );
}

export function StoryBuddyConnecting() {
  return (
    <div
      className="min-h-[400px] border-2 border-secondary rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4"
      style={{ backgroundColor: PANEL_BG.subtle }}
    >
      <div className="inline-flex items-center justify-center rounded-full border-2 border-primary/70 px-4 py-2">
        <span className="mr-3 inline-block h-8 w-8 rounded-full border-4 border-secondary/60 border-t-primary animate-spin motion-reduce:animate-none" />
        <span className="font-mono text-themed text-base">
          Connecting to Story Buddy…
        </span>
      </div>
      <p className="text-secondary text-sm max-w-xl">
        Setting up your story space. This usually takes just a moment.
      </p>
    </div>
  );
}

type WelcomeOverlayProps = {
  gameReady?: boolean;
  onStartNewStory: () => void;
  onContinueStory: () => void;
  embedTargetRef?: React.RefObject<HTMLDivElement | null>;
};

export function WelcomeOverlay({
  gameReady = false,
  onStartNewStory,
  onContinueStory,
  embedTargetRef,
}: WelcomeOverlayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        className="rounded-3xl border-[3px] border-primary px-5 py-4 flex items-start min-h-0"
        style={{ backgroundColor: PANEL_BG.default }}
      >
        <div className="space-y-2">
          <h2 className="font-mono font-bold text-themed text-lg">Overview</h2>
          <p className="text-sm text-themed leading-relaxed max-w-md">
            Every story starts with a single idea. You bring the idea. We&apos;ll
            help it become a story.
          </p>
          <h2 className="font-mono font-bold text-themed text-lg mt-8">
            How it works
          </h2>
          <p className="text-sm text-themed leading-relaxed max-w-md">
            You direct what happens (the beat). We render how it sounds (the
            prose). You refine the voice. Together you produce a short story in
            15–25 turns, with a decision point to end the story or build to a
            cliffhanger.
          </p>
          <p className="text-sm text-themed leading-relaxed max-w-md">
            Press <kbd className="font-mono">1</kbd>,{" "}
            <kbd className="font-mono">2</kbd>, or <kbd className="font-mono">3</kbd> to
            pick an option, or <kbd className="font-mono">4</kbd> to jump to the
            custom input.
          </p>
        </div>
      </div>
      <div
        className="rounded-3xl border-2 border-secondary px-5 py-4 flex items-start min-h-0 overflow-y-auto"
        style={{ backgroundColor: PANEL_BG.message }}
      >
        <div className="space-y-2">
          <h2 className="font-mono font-bold text-themed text-lg">
            How It Works
          </h2>
          <div className="text-sm text-themed leading-relaxed space-y-2 max-w-md">
            <p>
              You and your story co-write one sentence at a time. Each turn you
              choose a beat (or type your own, 8–18 words). You get three
              tonal renderings to pick from or edit (15–25 words). Add your
              sentence to the story and move on. At about 60% of the way you
              decide: end the story, end the chapter, or keep writing.
            </p>
          </div>
        </div>
      </div>
      <div
        className="rounded-3xl border-2 border-secondary px-5 py-4 flex items-start min-h-0"
        style={{ backgroundColor: PANEL_BG.message }}
      >
        <div className="space-y-2">
          <h2 className="font-mono font-bold text-themed text-lg">Example</h2>
          <div className="text-sm text-themed leading-relaxed max-w-md space-y-2">
            <p className="font-mono font-bold text-themed">The Gnome Whisperer</p>
            <p>
              Sarah&apos;s cat, Mr. Whiskers, had developed an unusual obsession
              with the neighbour&apos;s garden gnomes. Every morning, Mr.
              Whiskers would sit by the window, watching the colourful gnomes…
            </p>
            <p>[Continued...]</p>
          </div>
        </div>
      </div>
      <div
        className="rounded-3xl border-2 border-secondary px-5 py-4 flex flex-col min-h-0 overflow-hidden"
        style={{ backgroundColor: PANEL_BG.message }}
      >
        {embedTargetRef && (
          <div
            ref={embedTargetRef}
            className="w-full min-h-[120px] flex-1 overflow-y-auto"
          />
        )}
      </div>
      <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
        <PrimaryButton
          onClick={onStartNewStory}
          disabled={!gameReady}
          className="flex-1 rounded-3xl px-6 py-3"
        >
          Start a new story
        </PrimaryButton>
        <button
          type="button"
          onClick={onContinueStory}
          disabled={!gameReady}
          className="flex-1 rounded-3xl border-2 border-secondary px-6 py-3 font-mono text-base text-themed transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--palette-background) disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: getCardBg() }}
        >
          Continue a story
        </button>
      </div>
    </div>
  );
}

const OPENING_BEATS = [
  "a strange meeting",
  "an unexpected letter",
  "waking up somewhere unfamiliar",
] as const;

type OpeningPromptProps = {
  onSelectBeat: (beat: string) => void;
  onWriteYourOwn: () => void;
  customInputValue: string;
  onCustomInputChange: (value: string) => void;
  onSubmitCustom: () => void;
  wordCountMessage: string;
  isSubmitting: boolean;
  customInputRef: React.RefObject<HTMLInputElement | null>;
  customInputPlaceholder?: string;
};

export function OpeningPrompt({
  onSelectBeat,
  customInputValue,
  onCustomInputChange,
  onSubmitCustom,
  wordCountMessage,
  isSubmitting,
  customInputRef,
  customInputPlaceholder = "8–21 words",
}: OpeningPromptProps) {
  return (
    <Panel
      as="section"
      className="border-2 border-secondary rounded-3xl p-6 flex flex-col gap-4"
    >
      <h2 className="font-mono font-bold text-themed text-lg">
        Where does your story begin?
      </h2>
      <p className="text-sm text-secondary">
        Type a sentence, a fragment, or just a feeling. Or choose one of these
        to get started:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPENING_BEATS.map((beat) => (
          <button
            key={beat}
            type="button"
            onClick={() => onSelectBeat(beat)}
            disabled={isSubmitting}
            className="text-left px-4 py-3 border-2 border-primary rounded-2xl text-themed text-sm font-mono hover:bg-(--palette-primary)/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ backgroundColor: getCardBg() }}
          >
            {beat}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-themed font-mono">Or write your own…</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={customInputRef}
            type="text"
            value={customInputValue}
            onChange={(e) => onCustomInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitCustom()}
            disabled={isSubmitting}
            placeholder={customInputPlaceholder}
            className="flex-1 px-3 py-2 border-2 border-secondary rounded-2xl text-themed text-base font-mono bg-transparent placeholder:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <PrimaryButton
            onClick={onSubmitCustom}
            disabled={isSubmitting || !customInputValue.trim()}
          >
            {isSubmitting ? "…" : "Start"}
          </PrimaryButton>
        </div>
        {wordCountMessage && (
          <span className="text-xs font-mono text-secondary">
            {wordCountMessage}
          </span>
        )}
      </div>
    </Panel>
  );
}

type RefinementPanelProps = {
  renderings: [string, string, string];
  renderingTones: [string, string, string];
  selectedIndex: number;
  onSelectRendering: (index: number) => void;
  editableValue: string;
  onEditableChange: (value: string) => void;
  wordCountMessage: string;
  onAddToStory: () => void;
  agencyLocked: boolean;
  isSubmitting: boolean;
  refineWordMin?: number;
  refineWordMax?: number;
  onClearEditable?: () => void;
};

export function RefinementPanel({
  renderings,
  selectedIndex,
  onSelectRendering,
  editableValue,
  onEditableChange,
  wordCountMessage,
  onAddToStory,
  agencyLocked,
  isSubmitting,
  refineWordMin = 15,
  refineWordMax = 25,
  onClearEditable,
}: RefinementPanelProps) {
  return (
    <section
      className="border-2 border-secondary rounded-3xl p-4 flex flex-col gap-3 flex-1 min-h-0"
      aria-label="Refine your sentence"
      style={{ backgroundColor: PANEL_BG.default }}
    >
      <MessageBlock className="shrink-0">
        <p className="text-themed text-2xl leading-relaxed font-mono font-medium">
          Here&apos;s how that could sound
        </p>
      </MessageBlock>
      {agencyLocked && (
        <p className="text-sm text-secondary font-mono shrink-0">
          Two turns left. The choices are set — pick one.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 flex-1 min-h-0 overflow-y-auto">
        {([0, 1, 2] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectRendering(i)}
            disabled={isSubmitting}
            className={`text-left px-4 py-3 border-2 rounded-2xl text-themed text-sm font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selectedIndex === i ? "border-primary" : "border-secondary"
            }`}
            style={{ backgroundColor: getCardBg(selectedIndex === i) }}
          >
            {renderings[i] || "—"}
          </button>
        ))}
      </div>
      {!agencyLocked && (
        <>
          <p className="text-xs text-themed font-mono shrink-0">
            Pick one, or edit below ({refineWordMin}–{refineWordMax} words):
          </p>
          <div className="flex flex-col gap-2">
            <textarea
              value={editableValue}
              onChange={(e) => onEditableChange(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="w-full px-3 py-2 border-2 border-secondary rounded-2xl text-themed text-sm font-mono bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Edit your sentence…"
            />
            {onClearEditable && (
              <SecondaryButton
                onClick={onClearEditable}
                disabled={isSubmitting || !editableValue.trim()}
                className="self-start"
              >
                Clear input
              </SecondaryButton>
            )}
          </div>
          {wordCountMessage && (
            <span className="text-xs font-mono text-secondary">
              {wordCountMessage}
            </span>
          )}
        </>
      )}
      <PrimaryButton
        onClick={onAddToStory}
        disabled={isSubmitting}
        className="shrink-0"
      >
        Add to my story →
      </PrimaryButton>
    </section>
  );
}
