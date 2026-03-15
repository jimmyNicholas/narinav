"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  createEmptyStoryBible,
  mergeStoryBible,
  type StoryBible,
  type GameMode,
} from "@/lib/navinavTypes";
import {
  MAX_TURNS,
  DECISION_MOMENT_1,
  DECISION_MOMENT_2,
  ENDING_TURNS,
  CONTINUE_TURNS,
  AGENCY_LOCK_THRESHOLD,
} from "@/lib/constants";
import { validateWordCount } from "@/lib/wordCount";
import { BEAT_WORD_MIN, BEAT_WORD_MAX, REFINE_WORD_MIN, REFINE_WORD_MAX } from "@/lib/constants";
import {
  FinalStoryPanel,
  OptionsPanel,
  StoryBuddyConnecting,
  StorySoFarPanel,
  WelcomeOverlay,
  OpeningPrompt,
  RefinementPanel,
} from "@/reference/StoryBuddyPanels";
import {
  defaultNarinavOptions,
  type NarinavOptions,
} from "./NarinavOptionsPanel";

type View =
  | "welcome"
  | "continuePrompt"
  | "opening"
  | "loading"
  | "beatChoice"
  | "refinement"
  | "decision"
  | "naturalEndInterrupt"
  | "finalStory"
  | "finalChapter";

async function classifyInput(
  rawInput: string,
  devMode: boolean
): Promise<{ input_type: string; cleaned_input: string; notes: string }> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "classify",
      raw_input: rawInput,
      options: { devMode },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function callActiveBot(params: {
  cleanedInput: string;
  inputType: string;
  storySoFar: string[];
  storyBible: StoryBible;
  totalTurnCount: number;
  mode: GameMode;
  pathTurnLimit: number | null;
  turnsSinceDecision: number;
  maxTurns: number;
  devMode: boolean;
}): Promise<{
  renderings: [string, string, string];
  rendering_tones: [string, string, string];
  next_beats: [string, string, string];
  natural_ending_detected: boolean;
  story_bible_update: Record<string, unknown> | null;
  moral?: string | null;
  chapter_bible?: StoryBible | null;
}> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "activeBot",
      cleaned_input: params.cleanedInput,
      input_type: params.inputType,
      story_so_far: params.storySoFar,
      story_bible: params.storyBible,
      total_turn_count: params.totalTurnCount,
      mode: params.mode,
      path_turn_limit: params.pathTurnLimit,
      turns_since_decision: params.turnsSinceDecision,
      max_turns: params.maxTurns,
      options: { devMode: params.devMode },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function callFinalStoryBot(params: {
  storySoFar: string[];
  storyBible: StoryBible;
  mode: GameMode;
  moral: string | null;
  devMode: boolean;
}): Promise<{ title: string; story: string; preview_sentence: string }> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finalStory",
      story_so_far: params.storySoFar,
      story_bible: params.storyBible,
      mode: params.mode,
      moral: params.moral,
      options: { devMode: params.devMode },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export default function NarinavClient({
  options: optionsProp,
}: {
  options?: NarinavOptions | null;
}) {
  const options = optionsProp ?? defaultNarinavOptions;
  const maxTurns = Math.min(30, Math.max(5, options.maxTurns));

  const [view, setView] = useState<View>("welcome");
  const [storySoFar, setStorySoFar] = useState<string[]>([]);
  const [storyBible, setStoryBible] = useState<StoryBible>(createEmptyStoryBible());
  const [totalTurnCount, setTotalTurnCount] = useState(0);
  const [mode, setMode] = useState<GameMode>("open");
  const [decisionCount, setDecisionCount] = useState(0);
  const [pathTurnLimit, setPathTurnLimit] = useState<number | null>(null);
  const [turnsSinceDecision, setTurnsSinceDecision] = useState(0);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [finalStory, setFinalStory] = useState<string | null>(null);
  const [finalTitle, setFinalTitle] = useState<string | null>(null);
  const [moral, setMoral] = useState<string | null>(null);
  const [chapterBible, setChapterBible] = useState<StoryBible | null>(null);

  const [nextBeats, setNextBeats] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [renderings, setRenderings] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [renderingTones, setRenderingTones] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [selectedRenderingIndex, setSelectedRenderingIndex] = useState(0);
  const [refinedText, setRefinedText] = useState("");
  const [pendingStoryBibleUpdate, setPendingStoryBibleUpdate] = useState<
    Record<string, unknown> | null
  >(null);
  const [naturalEndingDetected, setNaturalEndingDetected] = useState(false);

  const [beatInputValue, setBeatInputValue] = useState("");
  const [openingInputValue, setOpeningInputValue] = useState("");
  const [continueBibleJson, setContinueBibleJson] = useState("");
  const [loadedBibleForContinue, setLoadedBibleForContinue] =
    useState<StoryBible | null>(null);

  const [isWaiting, setIsWaiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const beatInputRef = useRef<HTMLInputElement>(null);
  const openingInputRef = useRef<HTMLInputElement>(null);

  const narrativePosition =
    maxTurns > 0 ? Math.min(1, totalTurnCount / maxTurns) : 0;
  const turnsRemaining =
    pathTurnLimit !== null ? pathTurnLimit - turnsSinceDecision : null;
  const agencyLocked =
    turnsRemaining !== null && turnsRemaining <= AGENCY_LOCK_THRESHOLD;

  const storySoFarText = storySoFar.join("\n\n");
  const beatWordValidation = validateWordCount(
    beatInputValue.trim(),
    BEAT_WORD_MIN,
    BEAT_WORD_MAX
  );
  const openingWordValidation = validateWordCount(
    openingInputValue.trim(),
    BEAT_WORD_MIN,
    BEAT_WORD_MAX
  );
  const refineWordValidation = validateWordCount(
    refinedText.trim(),
    REFINE_WORD_MIN,
    REFINE_WORD_MAX
  );

  const handleStartNewStory = useCallback(() => {
    setView("opening");
    setStorySoFar([]);
    setStoryBible(createEmptyStoryBible());
    setTotalTurnCount(0);
    setMode("open");
    setDecisionCount(0);
    setPathTurnLimit(null);
    setTurnsSinceDecision(0);
    setChapterNumber(1);
    setNextBeats(["", "", ""]);
    setErrorMessage("");
  }, []);

  const handleContinueStory = useCallback(() => {
    setView("continuePrompt");
    setErrorMessage("");
  }, []);

  const handleLoadBible = useCallback(() => {
    try {
      const parsed = JSON.parse(continueBibleJson) as StoryBible;
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
      setLoadedBibleForContinue(parsed);
      setView("welcome"); // will show "Welcome back" in same view by having loadedBibleForContinue set; or we need a view "welcomeBack"
    } catch {
      setErrorMessage("Invalid story bible JSON.");
    }
  }, [continueBibleJson]);

  const handleBeginChapter = useCallback(() => {
    const bible = loadedBibleForContinue ?? createEmptyStoryBible();
    setStoryBible(bible);
    setStorySoFar([]);
    setTotalTurnCount(0);
    setMode("open");
    setDecisionCount(0);
    setPathTurnLimit(null);
    setTurnsSinceDecision(0);
    setChapterNumber(
      ((bible as StoryBible & { chapter?: number }).chapter ?? 1) + 1
    );
    setLoadedBibleForContinue(null);
    setContinueBibleJson("");
    setErrorMessage("");
    setView("loading");
    const firstBeat =
      bible.summary && String(bible.summary).trim()
        ? String(bible.summary).slice(0, 200)
        : "Continue the story.";
    callActiveBot({
      cleanedInput: firstBeat,
      inputType: "pre_generated",
      storySoFar: [],
      storyBible: bible,
      totalTurnCount: 0,
      mode: "open",
      pathTurnLimit: null,
      turnsSinceDecision: 0,
      maxTurns,
      devMode: options.devMode,
    })
      .then((r) => {
        setRenderings(r.renderings);
        setRenderingTones(r.rendering_tones);
        setNextBeats(r.next_beats);
        setSelectedRenderingIndex(0);
        setRefinedText(r.renderings[0] ?? "");
        setPendingStoryBibleUpdate(r.story_bible_update);
        setNaturalEndingDetected(r.natural_ending_detected);
        setView("refinement");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Request failed");
        setView("continuePrompt");
      })
      .finally(() => setIsWaiting(false));
    setIsWaiting(true);
  }, [loadedBibleForContinue, maxTurns, options.devMode]);

  const submitOpeningBeat = useCallback(
    (beat: string) => {
      setView("loading");
      setErrorMessage("");
      setIsWaiting(true);
      const run = (cleanedInput: string, inputType: string) => {
        callActiveBot({
          cleanedInput,
          inputType,
          storySoFar: [],
          storyBible: createEmptyStoryBible(),
          totalTurnCount: 0,
          mode: "open",
          pathTurnLimit: null,
          turnsSinceDecision: 0,
          maxTurns,
          devMode: options.devMode,
        })
          .then((r) => {
            setRenderings(r.renderings);
            setRenderingTones(r.rendering_tones);
            setNextBeats(r.next_beats);
            setSelectedRenderingIndex(0);
            setRefinedText(r.renderings[0] ?? "");
            setPendingStoryBibleUpdate(r.story_bible_update);
            setNaturalEndingDetected(r.natural_ending_detected);
            setView("refinement");
          })
          .catch((err) => {
            setErrorMessage(err instanceof Error ? err.message : "Request failed");
            setView("opening");
          })
          .finally(() => setIsWaiting(false));
      };
      if (beat.trim()) {
        run(beat.trim(), "pre_generated");
        return;
      }
      classifyInput(beat.trim(), options.devMode)
        .then((c) => run(c.cleaned_input, c.input_type))
        .catch((err) => {
          setErrorMessage(err instanceof Error ? err.message : "Classification failed");
          setView("opening");
          setIsWaiting(false);
        });
    },
    [maxTurns, options.devMode]
  );

  const handleOpeningSelectBeat = useCallback(
    (beat: string) => {
      submitOpeningBeat(beat);
    },
    [submitOpeningBeat]
  );

  const handleOpeningSubmitCustom = useCallback(() => {
    const text = openingInputValue.trim();
    if (!text) return;
    const v = validateWordCount(text, BEAT_WORD_MIN, BEAT_WORD_MAX);
    if (!v.valid) {
      setErrorMessage(v.message);
      return;
    }
    setErrorMessage("");
    submitOpeningBeat(text);
    setOpeningInputValue("");
  }, [openingInputValue, submitOpeningBeat]);

  const handleBeatClick = useCallback(
    (index: number, choiceText: string) => {
      if (view !== "beatChoice" || isWaiting) return;
      setView("loading");
      setErrorMessage("");
      setIsWaiting(true);
      callActiveBot({
        cleanedInput: choiceText,
        inputType: "pre_generated",
        storySoFar,
        storyBible,
        totalTurnCount,
        mode,
        pathTurnLimit,
        turnsSinceDecision,
        maxTurns,
        devMode: options.devMode,
      })
        .then((r) => {
          setRenderings(r.renderings);
          setRenderingTones(r.rendering_tones);
          setNextBeats(r.next_beats);
          setSelectedRenderingIndex(0);
          setRefinedText(r.renderings[0] ?? "");
          setPendingStoryBibleUpdate(r.story_bible_update);
          setNaturalEndingDetected(r.natural_ending_detected);
          if (mode === "ending" && r.moral != null) setMoral(r.moral);
          if (mode === "chapter" && r.chapter_bible != null)
            setChapterBible(r.chapter_bible);
          setView("refinement");
        })
        .catch((err) => {
          setErrorMessage(err instanceof Error ? err.message : "Request failed");
          setView("beatChoice");
        })
        .finally(() => setIsWaiting(false));
    },
    [
      view,
      isWaiting,
      storySoFar,
      storyBible,
      totalTurnCount,
      mode,
      pathTurnLimit,
      turnsSinceDecision,
      maxTurns,
      options.devMode,
    ]
  );

  const handleBeatSubmitCustom = useCallback(() => {
    const text = beatInputValue.trim();
    if (!text || view !== "beatChoice" || isWaiting) return;
    const v = validateWordCount(text, BEAT_WORD_MIN, BEAT_WORD_MAX);
    if (!v.valid) {
      setErrorMessage(v.message);
      return;
    }
    setErrorMessage("");
    setView("loading");
    setIsWaiting(true);
    classifyInput(text, options.devMode)
      .then((c) =>
        callActiveBot({
          cleanedInput: c.cleaned_input,
          inputType: c.input_type,
          storySoFar,
          storyBible,
          totalTurnCount,
          mode,
          pathTurnLimit,
          turnsSinceDecision,
          maxTurns,
          devMode: options.devMode,
        })
      )
      .then((r) => {
        setRenderings(r.renderings);
        setRenderingTones(r.rendering_tones);
        setNextBeats(r.next_beats);
        setSelectedRenderingIndex(0);
        setRefinedText(r.renderings[0] ?? "");
        setPendingStoryBibleUpdate(r.story_bible_update);
        setNaturalEndingDetected(r.natural_ending_detected);
        if (mode === "ending" && r.moral != null) setMoral(r.moral);
        if (mode === "chapter" && r.chapter_bible != null)
          setChapterBible(r.chapter_bible);
        setView("refinement");
        setBeatInputValue("");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Request failed");
        setView("beatChoice");
      })
      .finally(() => setIsWaiting(false));
  }, [
    beatInputValue,
    view,
    isWaiting,
    storySoFar,
    storyBible,
    totalTurnCount,
    mode,
    pathTurnLimit,
    turnsSinceDecision,
    maxTurns,
    options.devMode,
  ]);

  const triggerEndGame = useCallback(
    (committedStory: string[]) => {
      setView("loading");
      setIsWaiting(true);
      callFinalStoryBot({
        storySoFar: committedStory,
        storyBible,
        mode,
        moral,
        devMode: options.devMode,
      })
      .then((r) => {
        setFinalTitle(r.title);
        setFinalStory(r.story);
        setView(mode === "chapter" ? "finalChapter" : "finalStory");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Final story failed");
        setView("beatChoice");
      })
      .finally(() => setIsWaiting(false));
    },
    [storyBible, mode, moral, options.devMode]
  );

  const commitSentence = useCallback(
    (textToCommit: string) => {
      const nextStory = [...storySoFar, textToCommit];
      setStorySoFar(nextStory);
      if (pendingStoryBibleUpdate) {
        setStoryBible((b) =>
          mergeStoryBible(b, pendingStoryBibleUpdate as Parameters<typeof mergeStoryBible>[1])
        );
        setPendingStoryBibleUpdate(null);
      }
      const nextTurnCount = totalTurnCount + 1;
      const nextTurnsSince = turnsSinceDecision + 1;
      setTotalTurnCount(nextTurnCount);
      setTurnsSinceDecision(nextTurnCount === 0 ? 0 : nextTurnsSince);
      setRefinedText("");
      setView("beatChoice");

      if (nextTurnCount >= maxTurns) {
        triggerEndGame(nextStory);
        return;
      }
      const nextTurnsRemaining =
        pathTurnLimit !== null ? pathTurnLimit - nextTurnsSince : null;
      if (
        (mode === "ending" || mode === "chapter") &&
        nextTurnsRemaining !== null &&
        nextTurnsRemaining <= 0
      ) {
        triggerEndGame(nextStory);
        return;
      }
      if (
        mode === "continue" &&
        nextTurnsRemaining !== null &&
        nextTurnsRemaining <= 0
      ) {
        setView("decision");
        return;
      }
      if (naturalEndingDetected) {
        setNaturalEndingDetected(false);
        setView("naturalEndInterrupt");
        return;
      }
      const nextNarrativePos = nextTurnCount / maxTurns;
      if (decisionCount === 0 && nextNarrativePos >= DECISION_MOMENT_1) {
        setView("decision");
        return;
      }
      if (decisionCount === 1 && nextNarrativePos >= DECISION_MOMENT_2) {
        setView("decision");
        return;
      }
    },
    [
      storySoFar,
      totalTurnCount,
      turnsSinceDecision,
      pendingStoryBibleUpdate,
      pathTurnLimit,
      mode,
      decisionCount,
      maxTurns,
      naturalEndingDetected,
      triggerEndGame,
    ]
  );

  const handleAddToStory = useCallback(() => {
    const text = agencyLocked
      ? (renderings[selectedRenderingIndex] ?? "").trim()
      : refinedText.trim();
    if (!text) return;
    if (!agencyLocked) {
      const v = validateWordCount(text, REFINE_WORD_MIN, REFINE_WORD_MAX);
      if (!v.valid) {
        setErrorMessage(v.message);
        return;
      }
    }
    setErrorMessage("");
    commitSentence(text);
  }, [
    agencyLocked,
    renderings,
    selectedRenderingIndex,
    refinedText,
    commitSentence,
  ]);

  const handleSelectRendering = useCallback(
    (index: number) => {
      setSelectedRenderingIndex(index);
      setRefinedText(renderings[index] ?? "");
    },
    [renderings]
  );

  const handleRefinedTextChange = useCallback((value: string) => {
    setRefinedText(value);
  }, []);

  const handleDecision = useCallback(
    (choice: "ending" | "chapter" | "continue") => {
      setDecisionCount((c) => c + 1);
      if (choice === "ending" || choice === "chapter") {
        setMode(choice);
        setPathTurnLimit(ENDING_TURNS);
        setTurnsSinceDecision(0);
      } else {
        setMode("continue");
        setPathTurnLimit(CONTINUE_TURNS);
        setTurnsSinceDecision(0);
      }
      setView("beatChoice");
    },
    []
  );

  const handleNaturalEndChoice = useCallback(
    (endNow: boolean) => {
      if (endNow) {
        triggerEndGame(storySoFar);
      } else {
        setView("beatChoice");
      }
    },
    [storySoFar, triggerEndGame]
  );

  if (view === "welcome") {
    return (
      <div className="min-h-[420px]" aria-hidden={false}>
        {loadedBibleForContinue ? (
          <div
            className="border-2 border-secondary rounded-3xl p-6 space-y-4"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--palette-background) 94%, var(--palette-secondary) 6%)",
            }}
          >
            <h2 className="font-mono font-bold text-themed text-lg">
              Welcome back.
            </h2>
            {loadedBibleForContinue.title && (
              <p className="font-mono text-primary">
                {loadedBibleForContinue.title}
              </p>
            )}
            {loadedBibleForContinue.summary && (
              <p className="text-sm text-secondary">
                {loadedBibleForContinue.summary}
              </p>
            )}
            <p className="text-sm text-themed">Ready to continue?</p>
            <button
              type="button"
              onClick={handleBeginChapter}
              disabled={isWaiting}
              className="rounded-3xl border-2 px-6 py-3 font-mono text-base text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                backgroundColor:
                  "color-mix(in srgb, #4b9b6a 35%, var(--palette-background) 65%)",
                borderColor:
                  "color-mix(in srgb, #4b9b6a 80%, var(--palette-primary) 20%)",
              }}
            >
              {isWaiting
              ? "Loading…"
              : `Begin Chapter ${((loadedBibleForContinue as StoryBible & { chapter?: number })?.chapter ?? 1) + 1}`}
            </button>
          </div>
        ) : (
          <WelcomeOverlay
            gameReady={true}
            onStartNewStory={handleStartNewStory}
            onContinueStory={handleContinueStory}
          />
        )}
      </div>
    );
  }

  if (view === "continuePrompt") {
    return (
      <div className="border-2 border-secondary rounded-3xl p-6 space-y-4">
        <h2 className="font-mono font-bold text-themed text-lg">
          Continue a story
        </h2>
        <p className="text-sm text-secondary">
          Paste your story bible JSON from a previous chapter below.
        </p>
        <textarea
          value={continueBibleJson}
          onChange={(e) => setContinueBibleJson(e.target.value)}
          placeholder='{"title": "...", "summary": "...", ...}'
          className="w-full h-40 px-3 py-2 border-2 border-secondary rounded-2xl text-themed text-sm font-mono bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {errorMessage && (
          <p className="text-sm text-red-500 font-mono">{errorMessage}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleLoadBible}
            className="rounded-2xl border-2 px-4 py-2 font-mono text-base text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              backgroundColor:
                "color-mix(in srgb, #4b9b6a 35%, var(--palette-background) 65%)",
              borderColor:
                "color-mix(in srgb, #4b9b6a 80%, var(--palette-primary) 20%)",
            }}
          >
            Load story bible
          </button>
          <button
            type="button"
            onClick={() => {
              setView("welcome");
              setContinueBibleJson("");
              setErrorMessage("");
            }}
            className="rounded-2xl border-2 border-secondary px-4 py-2 font-mono text-base text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (view === "opening") {
    return (
      <div className="space-y-4">
        <OpeningPrompt
          onSelectBeat={handleOpeningSelectBeat}
          onWriteYourOwn={() => openingInputRef.current?.focus()}
          customInputValue={openingInputValue}
          onCustomInputChange={setOpeningInputValue}
          onSubmitCustom={handleOpeningSubmitCustom}
          wordCountMessage={openingInputValue.trim() ? openingWordValidation.message : ""}
          isSubmitting={isWaiting}
          customInputRef={openingInputRef}
        />
        {errorMessage && (
          <p className="text-sm text-red-500 font-mono">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (view === "loading") {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <StoryBuddyConnecting />
      </div>
    );
  }

  if (view === "refinement") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[420px]">
        <StorySoFarPanel
          storySoFar={storySoFarText}
          turnCount={totalTurnCount}
        />
        <RefinementPanel
          renderings={renderings}
          renderingTones={renderingTones}
          selectedIndex={selectedRenderingIndex}
          onSelectRendering={handleSelectRendering}
          editableValue={refinedText}
          onEditableChange={handleRefinedTextChange}
          wordCountMessage={refinedText.trim() ? refineWordValidation.message : ""}
          onAddToStory={handleAddToStory}
          agencyLocked={agencyLocked}
          isSubmitting={isWaiting}
        />
        {errorMessage && (
          <p className="lg:col-span-2 text-sm text-red-500 font-mono">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (view === "decision") {
    const turnsForEnd = pathTurnLimit ?? ENDING_TURNS;
    const turnsForContinue = pathTurnLimit ?? CONTINUE_TURNS;
    const showContinue = decisionCount === 0;
    return (
      <div
        className="border-2 border-secondary rounded-3xl p-6 space-y-4"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--palette-background) 94%, var(--palette-secondary) 6%)",
        }}
      >
        <h2 className="font-mono font-bold text-themed text-lg">
          Your story is finding its shape.
        </h2>
        <p className="text-sm text-themed">What do you want to do with it?</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleDecision("ending")}
            className="text-left rounded-2xl border-2 border-primary px-4 py-3 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--palette-background) 90%, var(--palette-secondary) 10%)",
            }}
          >
            End the story — you have {turnsForEnd} turns to land it
          </button>
          <button
            type="button"
            onClick={() => handleDecision("chapter")}
            className="text-left rounded-2xl border-2 border-primary px-4 py-3 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--palette-background) 90%, var(--palette-secondary) 10%)",
            }}
          >
            End this chapter — {turnsForEnd} turns to reach a cliffhanger
          </button>
          {showContinue && (
            <button
              type="button"
              onClick={() => handleDecision("continue")}
              className="text-left rounded-2xl border-2 border-primary px-4 py-3 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--palette-background) 90%, var(--palette-secondary) 10%)",
              }}
            >
              Keep writing — {turnsForContinue} more turns, then decide again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === "naturalEndInterrupt") {
    return (
      <div
        className="border-2 border-secondary rounded-3xl p-6 space-y-4"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--palette-background) 94%, var(--palette-secondary) 6%)",
        }}
      >
        <p className="font-mono text-themed">
          {mode === "ending"
            ? "This feels like it could end here."
            : "This feels like a good place to break."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleNaturalEndChoice(true)}
            className="rounded-2xl border-2 px-4 py-2 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              backgroundColor:
                "color-mix(in srgb, #4b9b6a 35%, var(--palette-background) 65%)",
              borderColor:
                "color-mix(in srgb, #4b9b6a 80%, var(--palette-primary) 20%)",
            }}
          >
            {mode === "ending" ? "End the story now" : "End the chapter here"}
          </button>
          <button
            type="button"
            onClick={() => handleNaturalEndChoice(false)}
            className="rounded-2xl border-2 border-secondary px-4 py-2 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Keep writing — {turnsRemaining ?? 0} turns left
          </button>
        </div>
      </div>
    );
  }

  if (view === "finalStory" || view === "finalChapter") {
    return (
      <div className="space-y-4">
        <section
          className="lg:col-span-2 border-2 border-secondary rounded-3xl p-6 flex flex-col min-h-[320px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--palette-background) 92%, var(--palette-secondary) 8%)",
          }}
        >
          <h2 className="font-mono font-bold text-themed text-lg mb-3">
            {view === "finalChapter" ? "Chapter" : "Final story"}
          </h2>
          {finalTitle && (
            <h3 className="font-mono text-primary text-base mb-3">
              {finalTitle}
            </h3>
          )}
          <div className="text-themed text-sm leading-relaxed flex-1 overflow-y-auto whitespace-pre-line font-mono">
            {finalStory ?? "(No story.)"}
          </div>
          {moral && view === "finalStory" && (
            <p className="mt-4 text-sm text-secondary font-mono italic">
              {moral}
            </p>
          )}
          {view === "finalChapter" && (
            <p className="mt-4 text-sm text-secondary">
              What happens next is up to you.
            </p>
          )}
        </section>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (finalStory) {
                navigator.clipboard.writeText(finalStory).catch(() => {});
              }
            }}
            className="rounded-2xl border-2 border-secondary px-4 py-2 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleStartNewStory}
            className="rounded-2xl border-2 px-4 py-2 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              backgroundColor:
                "color-mix(in srgb, #4b9b6a 35%, var(--palette-background) 65%)",
              borderColor:
                "color-mix(in srgb, #4b9b6a 80%, var(--palette-primary) 20%)",
            }}
          >
            Start a new story
          </button>
          {view === "finalChapter" && chapterBible && (
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify(chapterBible, null, 2);
                navigator.clipboard.writeText(json).catch(() => {});
              }}
              className="rounded-2xl border-2 border-secondary px-4 py-2 font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Copy story bible for Chapter {chapterNumber + 1}
            </button>
          )}
        </div>
      </div>
    );
  }

  // beatChoice
  const turnHeader =
    mode === "ending"
      ? `Bring it home. (${turnsRemaining ?? 0} turns left)`
      : mode === "chapter"
        ? `Build to the break. (${turnsRemaining ?? 0} turns left)`
        : mode === "continue"
          ? `Keep going. (${turnsRemaining ?? 0} turns left)`
          : "What happens next?";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[420px]">
      <StorySoFarPanel
        storySoFar={storySoFarText}
        turnCount={totalTurnCount}
      />
      <div className="flex flex-col gap-4 min-h-[500px]">
        {turnHeader && (
          <p className="font-mono text-themed text-lg font-medium">
            {turnHeader}
          </p>
        )}
        {errorMessage && (
          <p className="text-sm text-red-500 font-mono">{errorMessage}</p>
        )}
        <OptionsPanel
          choicesList={[...nextBeats]}
          allowCustomInput={!agencyLocked}
          isWaitingForPayload={isWaiting}
          customInputValue={beatInputValue}
          onCustomInputChange={setBeatInputValue}
          onCustomSubmit={handleBeatSubmitCustom}
          onChoiceClick={handleBeatClick}
          customInputRef={beatInputRef}
        />
        {beatInputValue.trim() && (
          <span className="text-xs font-mono text-secondary">
            {beatWordValidation.message}
          </span>
        )}
      </div>
    </div>
  );
}
