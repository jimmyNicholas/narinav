"use client";

import React from "react";

const STORAGE_KEY = "narinav-options";
const MIN_TURNS = 5;
const MAX_TURNS = 30;
const DEFAULT_MAX_TURNS = 6;

const MIN_SENTENCE_WORDS = 5;
const MAX_SENTENCE_WORDS = 25;
const DEFAULT_SENTENCE_MIN = 8;
const DEFAULT_SENTENCE_MAX = 18;

export type NarinavOptions = {
  shortSentencesOnly: boolean;
  shortSentenceMinWords: number;
  shortSentenceMaxWords: number;
  maxTurns: number;
  usePlayerWordsWhenPossible: boolean;
};

export const defaultNarinavOptions: NarinavOptions = {
  shortSentencesOnly: false,
  shortSentenceMinWords: DEFAULT_SENTENCE_MIN,
  shortSentenceMaxWords: DEFAULT_SENTENCE_MAX,
  maxTurns: DEFAULT_MAX_TURNS,
  usePlayerWordsWhenPossible: false,
};

function loadOptions(): NarinavOptions {
  if (typeof window === "undefined") return defaultNarinavOptions;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultNarinavOptions;
    const parsed = JSON.parse(raw) as Partial<NarinavOptions>;
    const minWords = clampSentenceWords(
      parsed.shortSentenceMinWords ?? DEFAULT_SENTENCE_MIN
    );
    const maxWords = clampSentenceWords(
      parsed.shortSentenceMaxWords ?? DEFAULT_SENTENCE_MAX
    );
    const normalizedMin = Math.min(minWords, maxWords);
    const normalizedMax = Math.max(minWords, maxWords);
    return {
      shortSentencesOnly: Boolean(parsed.shortSentencesOnly),
      shortSentenceMinWords: normalizedMin,
      shortSentenceMaxWords: normalizedMax,
      maxTurns: clampMaxTurns(parsed.maxTurns ?? DEFAULT_MAX_TURNS),
      usePlayerWordsWhenPossible: Boolean(parsed.usePlayerWordsWhenPossible),
    };
  } catch {
    return defaultNarinavOptions;
  }
}

function clampMaxTurns(n: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return DEFAULT_MAX_TURNS;
  return Math.min(MAX_TURNS, Math.max(MIN_TURNS, Math.round(num)));
}

function clampSentenceWords(n: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return DEFAULT_SENTENCE_MIN;
  return Math.min(
    MAX_SENTENCE_WORDS,
    Math.max(MIN_SENTENCE_WORDS, Math.round(num))
  );
}

function saveOptions(options: NarinavOptions) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // ignore
  }
}

type NarinavOptionsPanelProps = {
  options: NarinavOptions;
  onOptionsChange: (options: NarinavOptions) => void;
  onClose: () => void;
  panelId: string;
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

export function NarinavOptionsPanel({
  options,
  onOptionsChange,
  onClose,
  panelId,
  isOpen,
  triggerRef,
}: NarinavOptionsPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  const update = React.useCallback(
    (patch: Partial<NarinavOptions>) => {
      const next: NarinavOptions = { ...options, ...patch };
      if (typeof next.maxTurns === "number") {
        next.maxTurns = clampMaxTurns(next.maxTurns);
      }
      if (typeof next.shortSentenceMinWords === "number") {
        next.shortSentenceMinWords = clampSentenceWords(
          next.shortSentenceMinWords
        );
      }
      if (typeof next.shortSentenceMaxWords === "number") {
        next.shortSentenceMaxWords = clampSentenceWords(
          next.shortSentenceMaxWords
        );
      }
      if (next.shortSentenceMinWords > next.shortSentenceMaxWords) {
        const mid = Math.round(
          (next.shortSentenceMinWords + next.shortSentenceMaxWords) / 2
        );
        next.shortSentenceMinWords = mid;
        next.shortSentenceMaxWords = mid;
      }
      onOptionsChange(next);
      saveOptions(next);
    },
    [options, onOptionsChange]
  );

  // Focus first focusable when opening; restore focus to trigger when closing
  React.useEffect(() => {
    if (!isOpen) return;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      triggerRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label="Narinav options"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full z-50 mt-2 w-full min-w-[280px] max-w-sm rounded-2xl border-2 border-secondary p-4 font-mono text-themed shadow-lg"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--palette-background) 92%, var(--palette-secondary) 8%)",
      }}
    >
      <div className="space-y-4">
        {/* Short sentences only (configurable min/max) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="narinav-opt-short-sentences"
              className="text-sm text-themed cursor-pointer flex-1"
            >
              Short sentences only (5–25 words, default 8–18)
            </label>
            <button
              id="narinav-opt-short-sentences"
              type="button"
              role="switch"
              aria-checked={options.shortSentencesOnly}
              aria-label="Short sentences only (5–25 words, default 8–18)"
              onClick={() =>
                update({ shortSentencesOnly: !options.shortSentencesOnly })
              }
              className="relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
              style={{
                backgroundColor: options.shortSentencesOnly
                  ? "var(--palette-primary)"
                  : "color-mix(in srgb, var(--palette-background) 85%, var(--palette-secondary) 15%)",
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--palette-background)] shadow ring-0 transition-transform"
                style={{
                  transform: options.shortSentencesOnly
                    ? "translateX(1rem)"
                    : "translateX(0.125rem)",
                }}
              />
            </button>
          </div>
          <div className="flex flex-col gap-2 pl-1 pr-1">
            <div className="flex items-center justify-between text-xs text-secondary font-mono">
              <span>
                Range: {options.shortSentenceMinWords}–{options.shortSentenceMaxWords} words
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="narinav-opt-short-min-input"
                className="text-xs text-themed"
              >
                Min
              </label>
              <input
                id="narinav-opt-short-min-input"
                type="number"
                min={MIN_SENTENCE_WORDS}
                max={MAX_SENTENCE_WORDS}
                value={options.shortSentenceMinWords}
                disabled={!options.shortSentencesOnly}
                onChange={(e) =>
                  update({
                    shortSentenceMinWords: e.target.valueAsNumber,
                  })
                }
                className="w-16 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-xs text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
              />
              <label
                htmlFor="narinav-opt-short-max-input"
                className="text-xs text-themed"
              >
                Max
              </label>
              <input
                id="narinav-opt-short-max-input"
                type="number"
                min={MIN_SENTENCE_WORDS}
                max={MAX_SENTENCE_WORDS}
                value={options.shortSentenceMaxWords}
                disabled={!options.shortSentencesOnly}
                onChange={(e) =>
                  update({
                    shortSentenceMaxWords: e.target.valueAsNumber,
                  })
                }
                className="w-16 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-xs text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
              />
            </div>
          </div>
        </div>

        {/* Max turns */}
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="narinav-opt-max-turns" className="text-sm text-themed flex-1">
            Max turns
          </label>
          <input
            id="narinav-opt-max-turns"
            type="number"
            min={MIN_TURNS}
            max={MAX_TURNS}
            value={options.maxTurns}
            onChange={(e) => update({ maxTurns: e.target.valueAsNumber })}
            aria-label={`Maximum turns (${MIN_TURNS} to ${MAX_TURNS})`}
            className="w-16 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
          />
        </div>

        {/* Use player's words when possible */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="narinav-opt-player-words"
            className="text-sm text-themed cursor-pointer flex-1"
          >
            Use player&apos;s words when possible
          </label>
          <button
            id="narinav-opt-player-words"
            type="button"
            role="switch"
            aria-checked={options.usePlayerWordsWhenPossible}
            aria-label="Use player's words when possible"
            onClick={() =>
              update({ usePlayerWordsWhenPossible: !options.usePlayerWordsWhenPossible })
            }
            className="relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
            style={{
              backgroundColor: options.usePlayerWordsWhenPossible
                ? "var(--palette-primary)"
                : "color-mix(in srgb, var(--palette-background) 85%, var(--palette-secondary) 15%)",
            }}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--palette-background)] shadow ring-0 transition-transform"
              style={{
                transform: options.usePlayerWordsWhenPossible
                  ? "translateX(1rem)"
                  : "translateX(0.125rem)",
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export { loadOptions, saveOptions, MIN_TURNS, MAX_TURNS, DEFAULT_MAX_TURNS };
