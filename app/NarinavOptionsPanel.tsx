"use client";

import React from "react";
import {
  BEAT_WORD_MIN,
  BEAT_WORD_MAX,
  REFINE_WORD_MIN,
  REFINE_WORD_MAX,
  MAX_TURNS,
} from "@/lib/constants";

const STORAGE_KEY = "narinav-options";
const MIN_TURNS = 5;
const MAX_TURNS_UI = 30;
const DEFAULT_MAX_TURNS = MAX_TURNS;
const BEAT_WORD_MIN_UI = 5;
const BEAT_WORD_MAX_UI = 30;
const REFINE_WORD_MIN_UI = 10;
const REFINE_WORD_MAX_UI = 40;

export type NarinavOptions = {
  devMode: boolean;
  maxTurns: number;
  /** Beat word limit is fixed 8–18 per spec; displayed for reference. */
  beatWordMin: number;
  beatWordMax: number;
  refineWordMin: number;
  refineWordMax: number;
};

export const defaultNarinavOptions: NarinavOptions = {
  devMode: true,
  maxTurns: DEFAULT_MAX_TURNS,
  beatWordMin: BEAT_WORD_MIN,
  beatWordMax: BEAT_WORD_MAX,
  refineWordMin: REFINE_WORD_MIN,
  refineWordMax: REFINE_WORD_MAX,
};

function clampBeatWord(n: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return BEAT_WORD_MIN;
  return Math.min(BEAT_WORD_MAX_UI, Math.max(BEAT_WORD_MIN_UI, Math.round(num)));
}
function clampRefineWord(n: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return REFINE_WORD_MIN;
  return Math.min(REFINE_WORD_MAX_UI, Math.max(REFINE_WORD_MIN_UI, Math.round(num)));
}

function loadOptions(): NarinavOptions {
  if (typeof window === "undefined") return defaultNarinavOptions;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultNarinavOptions;
    const parsed = JSON.parse(raw) as Partial<NarinavOptions>;
    return {
      devMode: parsed.devMode !== false,
      maxTurns: clampMaxTurns(parsed.maxTurns ?? DEFAULT_MAX_TURNS),
      beatWordMin: clampBeatWord(parsed.beatWordMin ?? BEAT_WORD_MIN),
      beatWordMax: clampBeatWord(parsed.beatWordMax ?? BEAT_WORD_MAX),
      refineWordMin: clampRefineWord(parsed.refineWordMin ?? REFINE_WORD_MIN),
      refineWordMax: clampRefineWord(parsed.refineWordMax ?? REFINE_WORD_MAX),
    };
  } catch {
    return defaultNarinavOptions;
  }
}

function clampMaxTurns(n: number): number {
  const num = Number(n);
  if (Number.isNaN(num)) return DEFAULT_MAX_TURNS;
  return Math.min(MAX_TURNS_UI, Math.max(MIN_TURNS, Math.round(num)));
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
      if (typeof next.beatWordMin === "number") next.beatWordMin = clampBeatWord(next.beatWordMin);
      if (typeof next.beatWordMax === "number") next.beatWordMax = clampBeatWord(next.beatWordMax);
      if (typeof next.refineWordMin === "number") next.refineWordMin = clampRefineWord(next.refineWordMin);
      if (typeof next.refineWordMax === "number") next.refineWordMax = clampRefineWord(next.refineWordMax);
      if (next.beatWordMin > next.beatWordMax) next.beatWordMax = next.beatWordMin;
      if (next.refineWordMin > next.refineWordMax) next.refineWordMax = next.refineWordMin;
      onOptionsChange(next);
      saveOptions(next);
    },
    [options, onOptionsChange]
  );

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
        {/* Dev mode */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="narinav-opt-dev-mode"
            className="text-sm text-themed cursor-pointer flex-1"
          >
            Dev mode (claude-3-haiku-20240307)
          </label>
          <button
            id="narinav-opt-dev-mode"
            type="button"
            role="switch"
            aria-checked={options.devMode}
            aria-label="Dev mode"
            onClick={() => update({ devMode: !options.devMode })}
            className="relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--palette-background)"
            style={{
              backgroundColor: options.devMode
                ? "var(--palette-primary)"
                : "color-mix(in srgb, var(--palette-background) 85%, var(--palette-secondary) 15%)",
            }}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 rounded-full bg-(--palette-background) shadow ring-0 transition-transform"
              style={{
                transform: options.devMode
                  ? "translateX(1rem)"
                  : "translateX(0.125rem)",
              }}
            />
          </button>
        </div>

        {/* Max turns */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="narinav-opt-max-turns"
            className="text-sm text-themed flex-1"
          >
            Max turns
          </label>
          <input
            id="narinav-opt-max-turns"
            type="number"
            min={MIN_TURNS}
            max={MAX_TURNS_UI}
            value={options.maxTurns}
            onChange={(e) => update({ maxTurns: e.target.valueAsNumber })}
            aria-label={`Maximum turns (${MIN_TURNS} to ${MAX_TURNS_UI})`}
            className="w-16 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--palette-background)"
          />
        </div>

        {/* Beat word limits */}
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="narinav-opt-beat-min" className="text-sm text-themed flex-1">
            Beat words (min)
          </label>
          <input
            id="narinav-opt-beat-min"
            type="number"
            min={BEAT_WORD_MIN_UI}
            max={BEAT_WORD_MAX_UI}
            value={options.beatWordMin}
            onChange={(e) => update({ beatWordMin: e.target.valueAsNumber })}
            aria-label={`Beat words min (${BEAT_WORD_MIN_UI}–${BEAT_WORD_MAX_UI})`}
            className="w-14 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="narinav-opt-beat-max" className="text-sm text-themed flex-1">
            Beat words (max)
          </label>
          <input
            id="narinav-opt-beat-max"
            type="number"
            min={BEAT_WORD_MIN_UI}
            max={BEAT_WORD_MAX_UI}
            value={options.beatWordMax}
            onChange={(e) => update({ beatWordMax: e.target.valueAsNumber })}
            aria-label={`Beat words max (${BEAT_WORD_MIN_UI}–${BEAT_WORD_MAX_UI})`}
            className="w-14 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        {/* Refinement word limits */}
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="narinav-opt-refine-min" className="text-sm text-themed flex-1">
            Refinement words (min)
          </label>
          <input
            id="narinav-opt-refine-min"
            type="number"
            min={REFINE_WORD_MIN_UI}
            max={REFINE_WORD_MAX_UI}
            value={options.refineWordMin}
            onChange={(e) => update({ refineWordMin: e.target.valueAsNumber })}
            aria-label={`Refinement words min (${REFINE_WORD_MIN_UI}–${REFINE_WORD_MAX_UI})`}
            className="w-14 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="narinav-opt-refine-max" className="text-sm text-themed flex-1">
            Refinement words (max)
          </label>
          <input
            id="narinav-opt-refine-max"
            type="number"
            min={REFINE_WORD_MIN_UI}
            max={REFINE_WORD_MAX_UI}
            value={options.refineWordMax}
            onChange={(e) => update({ refineWordMax: e.target.valueAsNumber })}
            aria-label={`Refinement words max (${REFINE_WORD_MIN_UI}–${REFINE_WORD_MAX_UI})`}
            className="w-14 rounded-lg border-2 border-secondary bg-transparent px-2 py-1 text-themed text-sm text-right font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
    </div>
  );
}

export { loadOptions, saveOptions, MIN_TURNS, MAX_TURNS_UI, DEFAULT_MAX_TURNS };
