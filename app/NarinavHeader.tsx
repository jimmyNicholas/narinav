"use client";

import React from "react";
import {
  NarinavOptionsPanel,
  loadOptions,
  type NarinavOptions,
} from "./NarinavOptionsPanel";

type NarinavHeaderProps = {
  options: NarinavOptions;
  onOptionsChange: (options: NarinavOptions) => void;
};

const COG_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function NarinavHeader({ options, onOptionsChange }: NarinavHeaderProps) {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelId = "narinav-options-panel";

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !document.getElementById(panelId)?.contains(target)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  return (
    <header
      className="border-2 border-secondary rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--palette-background) 88%, var(--palette-secondary) 12%)",
      }}
    >
      <div className="space-y-2 flex-1">
        <h1 className="font-mono font-bold text-themed text-2xl md:text-3xl">
          Narinav
        </h1>
        <p className="text-secondary leading-relaxed text-sm">
          An interactive story-building companion. Co-write a story with Claude.
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-label="Open options"
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          aria-controls={panelOpen ? panelId : undefined}
          className="p-2 rounded-xl border-2 border-secondary text-themed transition-colors hover:bg-[color:var(--palette-primary)]/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--palette-background)]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--palette-background) 90%, var(--palette-secondary) 10%)",
          }}
        >
          {COG_SVG}
        </button>

        <NarinavOptionsPanel
          options={options}
          onOptionsChange={onOptionsChange}
          onClose={() => {
            setPanelOpen(false);
            triggerRef.current?.focus();
          }}
          panelId={panelId}
          isOpen={panelOpen}
          triggerRef={triggerRef}
        />
      </div>
    </header>
  );
}

export { loadOptions };
