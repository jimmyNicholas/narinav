"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  createEmptyStoryBible,
  mergeStoryBible,
  normalizeStoryBible,
  type StoryBible,
  type GameMode,
} from "@/lib/navinavTypes";
import {
  MAX_TURNS,
  DECISION_MOMENT_1,
  DECISION_MOMENT_2,
  ENDING_TURNS,
  CONTINUE_TURNS,
  OPENING_TURNS,
  AGENCY_LOCK_THRESHOLD,
} from "@/lib/constants";
import { validateWordCount } from "@/lib/wordCount";
import {
  ErrorOverlay,
  FinalStoryPanel,
  LoadingOrErrorPanel,
  OptionsPanel,
  StorySoFarPanel,
  WelcomeOverlay,
  OpeningPrompt,
  RefinementPanel,
} from "./NarnavPanels";
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

function getEndingPressure(
  pathTurnLimit: number | null,
  turnsSinceDecision: number
): number {
  const turnsRemaining =
    pathTurnLimit !== null ? pathTurnLimit - turnsSinceDecision : null;
  if (turnsRemaining === null || turnsRemaining > 4) return 0;
  if (turnsRemaining >= 3) return 1;
  if (turnsRemaining === 2) return 2;
  return 3;
}

function getBeatModeForTurn(mode: GameMode, turnsElapsed: number): GameMode {
  if (mode === "open" || mode === "continue") {
    return turnsElapsed >= OPENING_TURNS ? "continue" : "open";
  }
  return mode;
}

async function callBeatBot(params: {
  storySoFar: string[];
  storyBible: StoryBible;
  mode: GameMode;
  totalTurnCount: number;
  pathTurnLimit: number | null;
  turnsSinceDecision: number;
  maxTurns: number;
  devMode: boolean;
}): Promise<{ next_beats: [string, string, string] }> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "beatBot",
      story_so_far: params.storySoFar,
      story_bible: params.storyBible,
      mode: params.mode,
      total_turn_count: params.totalTurnCount,
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

async function callRefinementBot(params: {
  storySoFar: string[];
  storyBible: StoryBible;
  cleanedInput: string;
  inputType: string;
  mode: GameMode;
  totalTurnCount: number;
  pathTurnLimit?: number | null;
  turnsSinceDecision?: number;
  devMode: boolean;
}): Promise<{
  renderings: [string, string, string];
  natural_ending_detected: boolean;
  moral?: string | null;
  chapter_bible?: StoryBible | null;
}> {
  const body: Record<string, unknown> = {
    action: "refinementBot",
    story_so_far: params.storySoFar,
    story_bible: params.storyBible,
    cleaned_input: params.cleanedInput,
    input_type: params.inputType,
    mode: params.mode,
    total_turn_count: params.totalTurnCount,
    options: { devMode: params.devMode },
  };
  if (params.mode === "ending" || params.mode === "chapter") {
    if (params.pathTurnLimit !== undefined) body.path_turn_limit = params.pathTurnLimit;
    if (params.turnsSinceDecision !== undefined)
      body.turns_since_decision = params.turnsSinceDecision;
  }
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function callStoryBibleUpdate(params: {
  currentBible: StoryBible;
  recentEntries: string[];
  mode: GameMode;
  devMode: boolean;
}): Promise<{ story_bible_update: Parameters<typeof mergeStoryBible>[1] }> {
  const res = await fetch("/api/story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "storyBibleUpdate",
      current_bible: params.currentBible,
      recent_entries: params.recentEntries,
      mode: params.mode,
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
  /** Last 5 story bibles before each update (for safety / rollback). */
  const [storyBibleHistory, setStoryBibleHistory] = useState<StoryBible[]>([]);
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
  const OPENING_BEATS_FALLBACK: [string, string, string] = [
    "a strange meeting",
    "an unexpected letter",
    "waking up somewhere unfamiliar",
  ];
  const [openingBeats, setOpeningBeats] =
    useState<[string, string, string]>(OPENING_BEATS_FALLBACK);
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
  const [naturalEndingDetected, setNaturalEndingDetected] = useState(false);

  const [beatInputValue, setBeatInputValue] = useState("");
  const [openingInputValue, setOpeningInputValue] = useState("");
  const [continueBibleJson, setContinueBibleJson] = useState("");
  const [loadedBibleForContinue, setLoadedBibleForContinue] =
    useState<StoryBible | null>(null);

  const [selectedBeat, setSelectedBeat] = useState<string | null>(null);
  const [beatRemovesLeft, setBeatRemovesLeft] = useState(2);
  const [beatRefreshesLeft, setBeatRefreshesLeft] = useState(2);

  const [isWaiting, setIsWaiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const lastRetryRef = useRef<(() => void) | null>(null);
  const beatInputRef = useRef<HTMLTextAreaElement>(null);
  const openingInputRef = useRef<HTMLInputElement>(null);

  const narrativePosition =
    maxTurns > 0 ? Math.min(1, totalTurnCount / maxTurns) : 0;
  const turnsRemaining =
    pathTurnLimit !== null ? pathTurnLimit - turnsSinceDecision : null;
  const agencyLocked =
    turnsRemaining !== null && turnsRemaining <= AGENCY_LOCK_THRESHOLD;

  const storySoFarText = storySoFar.join("\n\n");
  const playerInputMax = options.playerInputMaxWords;
  const beatWordValidation = validateWordCount(
    beatInputValue.trim(),
    1,
    playerInputMax
  );
  const openingWordValidation = validateWordCount(
    openingInputValue.trim(),
    1,
    playerInputMax
  );
  const refineWordValidation = validateWordCount(
    refinedText.trim(),
    options.refineWordMin,
    options.refineWordMax
  );

  const handleStartNewStory = useCallback(() => {
    setStorySoFar([]);
    setStoryBible(createEmptyStoryBible());
    setTotalTurnCount(0);
    setMode("open");
    setDecisionCount(0);
    setPathTurnLimit(null);
    setTurnsSinceDecision(0);
    setChapterNumber(1);
    setNextBeats(["", "", ""]);
    setSelectedBeat(null);
    setBeatRemovesLeft(2);
    setErrorMessage("");
    setView("loading");
    setIsWaiting(true);
    const emptyBible = createEmptyStoryBible();
    const beatMode = getBeatModeForTurn("open", 0);
    callBeatBot({
      storySoFar: [],
      storyBible: emptyBible,
      mode: beatMode,
      totalTurnCount: 0,
      pathTurnLimit: null,
      turnsSinceDecision: 0,
      maxTurns,
      devMode: options.devMode,
    })
      .then((r) => {
        setOpeningBeats(r.next_beats);
        setView("opening");
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Request failed");
        setOpeningBeats(OPENING_BEATS_FALLBACK);
        setView("opening");
      })
      .finally(() => setIsWaiting(false));
  }, [maxTurns, options.devMode]);

  const handleContinueStory = useCallback(() => {
    setView("continuePrompt");
    setErrorMessage("");
  }, []);

  const handleLoadBible = useCallback(() => {
    try {
      const parsed = JSON.parse(continueBibleJson) as StoryBible;
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
      setLoadedBibleForContinue(normalizeStoryBible(parsed as Partial<StoryBible>) as StoryBible);
      setView("welcome"); // will show "Welcome back" in same view by having loadedBibleForContinue set; or we need a view "welcomeBack"
    } catch {
      setErrorMessage("Invalid story bible JSON.");
    }
  }, [continueBibleJson]);

  const handleBeginChapter = useCallback(() => {
    const bible = loadedBibleForContinue ?? createEmptyStoryBible();
    setStoryBible(normalizeStoryBible(bible as Partial<StoryBible>));
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
    callRefinementBot({
      storySoFar: [],
      storyBible: bible,
      cleanedInput: firstBeat,
      inputType: "pre_generated",
      mode: "open",
      totalTurnCount: 0,
      devMode: options.devMode,
    })
        .then((r) => {
          setRenderings(r.renderings);
          setRenderingTones(["", "", ""]);
          setSelectedRenderingIndex(0);
          setRefinedText(r.renderings[0] ?? "");
          setNaturalEndingDetected(r.natural_ending_detected);
          setSelectedBeat(firstBeat);
          setBeatRemovesLeft(2);
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
        callRefinementBot({
          storySoFar: [],
          storyBible: createEmptyStoryBible(),
          cleanedInput,
          inputType,
          mode: "open",
          totalTurnCount: 0,
          devMode: options.devMode,
        })
          .then((r) => {
            setRenderings(r.renderings);
            setRenderingTones(["", "", ""]);
            setSelectedRenderingIndex(0);
            setRefinedText(r.renderings[0] ?? "");
            setNaturalEndingDetected(r.natural_ending_detected);
            setSelectedBeat(beat.trim());
            setBeatRemovesLeft(2);
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
    const v = validateWordCount(text, 1, options.playerInputMaxWords);
    if (!v.valid) {
      setErrorMessage(v.message);
      return;
    }
    setErrorMessage("");
    submitOpeningBeat(text);
    setOpeningInputValue("");
  }, [openingInputValue, options.playerInputMaxWords, submitOpeningBeat]);

  const handleBeatClick = useCallback(
    (index: number, choiceText: string) => {
      if (view !== "beatChoice" || isWaiting) return;
      setView("loading");
      setErrorMessage("");
      setIsWaiting(true);

      if (mode === "open" || mode === "continue") {
        callRefinementBot({
          storySoFar,
          storyBible,
          cleanedInput: choiceText,
          inputType: "pre_generated",
          mode,
          totalTurnCount,
          devMode: options.devMode,
        })
          .then((r) => {
            setRenderings(r.renderings);
            setRenderingTones(["", "", ""]);
            setSelectedRenderingIndex(0);
            setRefinedText(r.renderings[0] ?? "");
            setNaturalEndingDetected(r.natural_ending_detected);
            setSelectedBeat(choiceText);
            setBeatRemovesLeft(2);
            setView("refinement");
          })
          .catch((err) => {
            setErrorMessage(err instanceof Error ? err.message : "Request failed");
            setView("beatChoice");
          })
          .finally(() => setIsWaiting(false));
        return;
      }

      callRefinementBot({
        storySoFar,
        storyBible,
        cleanedInput: choiceText,
        inputType: "pre_generated",
        mode,
        totalTurnCount,
        pathTurnLimit: mode === "ending" || mode === "chapter" ? pathTurnLimit : undefined,
        turnsSinceDecision:
          mode === "ending" || mode === "chapter" ? turnsSinceDecision : undefined,
        devMode: options.devMode,
      })
        .then((r) => {
          setRenderings(r.renderings);
          setRenderingTones(["", "", ""]);
          setSelectedRenderingIndex(0);
          setRefinedText(r.renderings[0] ?? "");
          setNaturalEndingDetected(r.natural_ending_detected);
          if (mode === "ending" && r.moral != null) setMoral(r.moral);
          if (mode === "chapter" && r.chapter_bible != null)
            setChapterBible(normalizeStoryBible(r.chapter_bible as Partial<StoryBible>) as StoryBible);
          setSelectedBeat(choiceText);
          setBeatRemovesLeft(2);
          const pressure = getEndingPressure(pathTurnLimit, turnsSinceDecision);
          if (pressure < 3) {
            const beatMode = getBeatModeForTurn(mode, totalTurnCount);
            return callBeatBot({
              storySoFar,
              storyBible,
              mode: beatMode,
              totalTurnCount,
              pathTurnLimit,
              turnsSinceDecision,
              maxTurns,
              devMode: options.devMode,
            }).then((b) => {
              setNextBeats(b.next_beats);
              setBeatRefreshesLeft(2);
              setView("refinement");
            });
          }
          setNextBeats(["", "", ""]);
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
    const v = validateWordCount(text, 1, options.playerInputMaxWords);
    if (!v.valid) {
      setErrorMessage(v.message);
      return;
    }
    setErrorMessage("");
    setView("loading");
    setIsWaiting(true);

    const runRefinement = (cleanedInput: string, inputType: string) => {
      if (mode === "open" || mode === "continue") {
        return callRefinementBot({
          storySoFar,
          storyBible,
          cleanedInput,
          inputType,
          mode,
          totalTurnCount,
          devMode: options.devMode,
        }).then((r) => {
          setRenderings(r.renderings);
          setRenderingTones(["", "", ""]);
          setSelectedRenderingIndex(0);
          setRefinedText(r.renderings[0] ?? "");
          setNaturalEndingDetected(r.natural_ending_detected);
          setSelectedBeat(text);
          setBeatRemovesLeft(2);
          setView("refinement");
          setBeatInputValue("");
        });
      }
      return callRefinementBot({
        storySoFar,
        storyBible,
        cleanedInput,
        inputType,
        mode,
        totalTurnCount,
        pathTurnLimit,
        turnsSinceDecision,
        devMode: options.devMode,
      }).then((r) => {
        setRenderings(r.renderings);
        setRenderingTones(["", "", ""]);
        setSelectedRenderingIndex(0);
        setRefinedText(r.renderings[0] ?? "");
        setNaturalEndingDetected(r.natural_ending_detected);
        if (mode === "ending" && r.moral != null) setMoral(r.moral);
        if (mode === "chapter" && r.chapter_bible != null)
          setChapterBible(normalizeStoryBible(r.chapter_bible as Partial<StoryBible>) as StoryBible);
        setSelectedBeat(text);
        setBeatRemovesLeft(2);
        setBeatInputValue("");
        const pressure = getEndingPressure(pathTurnLimit, turnsSinceDecision);
        if (pressure < 3) {
          const beatMode = getBeatModeForTurn(mode, totalTurnCount);
          return callBeatBot({
            storySoFar,
            storyBible,
            mode: beatMode,
            totalTurnCount,
            pathTurnLimit,
            turnsSinceDecision,
            maxTurns,
            devMode: options.devMode,
          }).then((b) => {
            setNextBeats(b.next_beats);
            setBeatRefreshesLeft(2);
            setView("refinement");
          });
        }
        setNextBeats(["", "", ""]);
        setView("refinement");
      });
    };

    classifyInput(text, options.devMode)
      .then((c) => runRefinement(c.cleaned_input, c.input_type))
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
    options.playerInputMaxWords,
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
      const lastFiveEntries = nextStory.slice(-5);
      const nextTurnCount = totalTurnCount + 1;
      const nextTurnsSince = turnsSinceDecision + 1;
      setTotalTurnCount(nextTurnCount);
      setTurnsSinceDecision(nextTurnCount === 0 ? 0 : nextTurnsSince);
      setRefinedText("");
      setSelectedBeat(null);

      if (mode === "open" && nextTurnCount >= OPENING_TURNS) {
        setMode("continue");
      }

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

      if (mode === "open" || mode === "continue") {
        const runBibleThenBeats = () => {
          setIsWaiting(true);
          setErrorMessage("");
          callStoryBibleUpdate({
            currentBible: storyBible,
            recentEntries: lastFiveEntries,
            mode,
            devMode: options.devMode,
          })
            .then((r) => {
              const merged = mergeStoryBible(storyBible, r.story_bible_update);
              setStoryBible((b) => {
                setStoryBibleHistory((h) => [...h.slice(-4), b].slice(-5));
                return merged;
              });
              return merged;
            })
            .catch(() => {
              return storyBible;
            })
            .then((bibleToUse) => {
              const beatMode = getBeatModeForTurn(mode, nextTurnCount);
              return callBeatBot({
                storySoFar: nextStory,
                storyBible: bibleToUse,
                mode: beatMode,
                totalTurnCount: nextTurnCount,
                pathTurnLimit,
                turnsSinceDecision: nextTurnsSince,
                maxTurns,
                devMode: options.devMode,
              });
            })
            .then((r) => {
              setNextBeats(r.next_beats);
              setBeatRefreshesLeft(2);
              setView("beatChoice");
              lastRetryRef.current = null;
            })
            .catch((err) => {
              setErrorMessage(err instanceof Error ? err.message : "Request failed");
              // keep view on "loading" so error shows in same space
            })
            .finally(() => setIsWaiting(false));
        };
        lastRetryRef.current = runBibleThenBeats;
        setView("loading");
        runBibleThenBeats();
      } else {
        callStoryBibleUpdate({
          currentBible: storyBible,
          recentEntries: lastFiveEntries,
          mode,
          devMode: options.devMode,
        })
          .then((r) => {
            setStoryBible((b) => {
              setStoryBibleHistory((h) => [...h.slice(-4), b].slice(-5));
              return mergeStoryBible(b, r.story_bible_update);
            });
          })
          .catch(() => {});
        setView("beatChoice");
      }
    },
    [
      storySoFar,
      storyBible,
      totalTurnCount,
      turnsSinceDecision,
      pathTurnLimit,
      mode,
      decisionCount,
      maxTurns,
      naturalEndingDetected,
      triggerEndGame,
      options.devMode,
    ]
  );

  const handleAddToStory = useCallback(() => {
    const text = agencyLocked
      ? (renderings[selectedRenderingIndex] ?? "").trim()
      : refinedText.trim();
    if (!text) return;
    if (!agencyLocked) {
      const v = validateWordCount(text, options.refineWordMin, options.refineWordMax);
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
    options.refineWordMin,
    options.refineWordMax,
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

  const handleRemoveBeat = useCallback(() => {
    setBeatRemovesLeft((n) => Math.max(0, n - 1));
    setSelectedBeat(null);
    setView("beatChoice");
  }, []);

  const handleBeatRefresh = useCallback(() => {
    if (beatRefreshesLeft <= 0 || isWaiting) return;
    setErrorMessage("");
    setIsWaiting(true);
    const beatMode = getBeatModeForTurn(mode, totalTurnCount);
    callBeatBot({
      storySoFar,
      storyBible,
      mode: beatMode,
      totalTurnCount,
      pathTurnLimit,
      turnsSinceDecision,
      maxTurns,
      devMode: options.devMode,
    })
      .then((b) => {
        setNextBeats(b.next_beats);
        setBeatRefreshesLeft((n) => Math.max(0, n - 1));
      })
      .catch((err) => {
        setErrorMessage(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => setIsWaiting(false));
  }, [
    beatRefreshesLeft,
    isWaiting,
    storySoFar,
    storyBible,
    mode,
    totalTurnCount,
    pathTurnLimit,
    turnsSinceDecision,
    maxTurns,
    options.devMode,
  ]);

  const handleDecision = useCallback(
    (choice: "chapter" | "continue") => {
      setDecisionCount((c) => c + 1);
      if (choice === "chapter") {
        setMode("chapter");
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

  let mainContent: React.ReactNode = null;
  if (view === "welcome") {
    mainContent = (
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
  } else if (view === "continuePrompt") {
    mainContent = (
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
  } else if (view === "opening") {
    mainContent = (
      <div className="space-y-4">
        <OpeningPrompt
          choicesList={[...openingBeats]}
          onSelectBeat={handleOpeningSelectBeat}
          onWriteYourOwn={() => openingInputRef.current?.focus()}
          customInputValue={openingInputValue}
          onCustomInputChange={setOpeningInputValue}
          onSubmitCustom={handleOpeningSubmitCustom}
          wordCountMessage={openingInputValue.trim() ? openingWordValidation.message : ""}
          isSubmitting={isWaiting}
          customInputRef={openingInputRef}
          customInputPlaceholder={`Up to ${options.playerInputMaxWords} words`}
        />
        {errorMessage && (
          <p className="text-sm text-red-500 font-mono">{errorMessage}</p>
        )}
      </div>
    );
  } else if (view === "loading") {
    mainContent = (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingOrErrorPanel
          errorMessage={errorMessage || null}
          onTryAgain={() => {
            setErrorMessage("");
            lastRetryRef.current?.();
          }}
        />
      </div>
    );
  } else if (view === "refinement") {
    mainContent = (
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[420px]">
        <StorySoFarPanel
          storySoFar={storySoFarText}
          turnCount={totalTurnCount}
          maxTurns={maxTurns}
          selectedBeat={selectedBeat}
          onRemoveBeat={handleRemoveBeat}
          canRemoveBeat={beatRemovesLeft > 0}
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
          refineWordMin={options.refineWordMin}
          refineWordMax={options.refineWordMax}
          onClearEditable={() => setRefinedText("")}
        />
        {errorMessage && (
          <p className="lg:col-span-2 text-sm text-red-500 font-mono">
            {errorMessage}
          </p>
        )}
      </div>
    );
  } else if (view === "decision") {
    const turnsForEnd = pathTurnLimit ?? ENDING_TURNS;
    const turnsForContinue = pathTurnLimit ?? CONTINUE_TURNS;
    const showContinue = decisionCount === 0;
    mainContent = (
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
  } else if (view === "naturalEndInterrupt") {
    mainContent = (
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
  } else if (view === "finalStory" || view === "finalChapter") {
    mainContent = (
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
  } else {
    // beatChoice
    const turnHeader =
      mode === "ending"
        ? `Bring it home. (${turnsRemaining ?? 0} turns left)`
        : mode === "chapter"
          ? `Build to the break. (${turnsRemaining ?? 0} turns left)`
          : mode === "continue"
            ? `Keep going. (${turnsRemaining ?? 0} turns left)`
            : "What happens next?";

    mainContent = (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 min-h-[420px]">
      <StorySoFarPanel
        storySoFar={storySoFarText}
        turnCount={totalTurnCount}
        maxTurns={maxTurns}
      />
      <div className="flex flex-col gap-4 min-h-[500px]">
        {turnHeader && (
          <section
            className="border-2 border-secondary rounded-3xl p-5"
            aria-label="Message"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--palette-background) 97%, var(--palette-secondary) 3%)",
            }}
          >
            <p className="text-themed text-2xl leading-relaxed whitespace-pre-line font-mono font-medium">
              {turnHeader}
            </p>
          </section>
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
          onRefreshBeats={handleBeatRefresh}
          beatRefreshesLeft={beatRefreshesLeft}
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

  return (
    <div className="relative">
      {mainContent}
      {errorMessage && view !== "loading" && (
        <ErrorOverlay
          message={errorMessage}
          onTryAgain={() => setErrorMessage("")}
        />
      )}
    </div>
  );
}
