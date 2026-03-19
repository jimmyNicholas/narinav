"use client";

import React from "react";

/**
 * Shared Narnav panel/chrome styles. Use across NarnavPanels and NarinavClient
 * so borders, backgrounds, and buttons stay consistent.
 */

const PANEL_BG = {
  /** Default panel (94% background, 6% secondary). */
  default: "color-mix(in srgb, var(--palette-background) 94%, var(--palette-secondary) 6%)",
  /** Softer (92/8). */
  soft: "color-mix(in srgb, var(--palette-background) 92%, var(--palette-secondary) 8%)",
  /** Message-style, light (97/3). */
  message: "color-mix(in srgb, var(--palette-background) 97%, var(--palette-secondary) 3%)",
  /** Subtle (96/4). */
  subtle: "color-mix(in srgb, var(--palette-background) 96%, var(--palette-secondary) 4%)",
} as const;

const CARD_BG = "color-mix(in srgb, var(--palette-background) 90%, var(--palette-secondary) 10%)";
const CARD_BG_SELECTED = "color-mix(in srgb, var(--palette-primary) 20%, var(--palette-background) 80%)";
const BUBBLE_BG = "color-mix(in srgb, var(--palette-primary) 15%, var(--palette-background) 85%)";
const PRIMARY_BTN_BG = "color-mix(in srgb, #4b9b6a 35%, var(--palette-background) 65%)";
const PRIMARY_BTN_BORDER = "color-mix(in srgb, #4b9b6a 80%, var(--palette-primary) 20%)";

type PanelVariant = keyof typeof PANEL_BG;

type PanelProps = {
  children: React.ReactNode;
  variant?: PanelVariant;
  as?: "section" | "div";
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
};

/** Wrapper for panel/section chrome: rounded border and background. */
export function Panel({
  children,
  variant = "default",
  as: Tag = "section",
  className = "",
  style = {},
  "aria-label": ariaLabel,
}: PanelProps) {
  return (
    <Tag
      className={className}
      style={{ backgroundColor: PANEL_BG[variant], ...style }}
      aria-label={ariaLabel}
    >
      {children}
    </Tag>
  );
}

type MessageBlockProps = {
  children: React.ReactNode;
  className?: string;
};

/** Message-to-player style block (light background, rounded border). */
export function MessageBlock({ children, className = "" }: MessageBlockProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-secondary p-4 ${className}`.trim()}
      style={{ backgroundColor: PANEL_BG.message }}
    >
      {children}
    </div>
  );
}

/** Highlight bubble (e.g. selected beat). */
export function Bubble({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border-2 border-primary px-4 py-3 text-themed text-sm font-mono ${className}`.trim()}
      style={{ backgroundColor: BUBBLE_BG }}
    >
      {children}
    </div>
  );
}

const primaryButtonClass =
  "rounded-2xl border-2 px-4 py-2 font-mono text-base font-medium text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed";

type PrimaryButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
};

/** Green primary action button. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${primaryButtonClass} ${className}`.trim()}
      aria-label={ariaLabel}
      style={{
        backgroundColor: PRIMARY_BTN_BG,
        borderColor: PRIMARY_BTN_BORDER,
        borderWidth: 2,
        borderStyle: "solid",
      }}
    >
      {children}
    </button>
  );
}

const secondaryButtonClass =
  "rounded-xl border-2 border-secondary px-3 py-1.5 text-sm font-mono text-themed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

type SecondaryButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button";
  className?: string;
  "aria-label"?: string;
};

/** Secondary/gray action button. */
export function SecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${secondaryButtonClass} ${className}`.trim()}
      aria-label={ariaLabel}
      style={{ backgroundColor: CARD_BG }}
    >
      {children}
    </button>
  );
}

/** Card-style background for choice buttons and similar. */
export function getCardBg(selected?: boolean) {
  return selected ? CARD_BG_SELECTED : CARD_BG;
}

export { PANEL_BG, CARD_BG, CARD_BG_SELECTED, BUBBLE_BG, PRIMARY_BTN_BG, PRIMARY_BTN_BORDER };
