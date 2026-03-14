import { useEffect } from "react";

type UseStoryBuddyShortcutsParams = {
  choicesList: string[];
  isWaitingForPayload: boolean;
  onChoiceSelected: (index: number, choiceText: string) => void;
  focusCustomInput: () => void;
};

export function useStoryBuddyShortcuts({
  choicesList,
  isWaitingForPayload,
  onChoiceSelected,
  focusCustomInput,
}: UseStoryBuddyShortcutsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingContext =
        tag === "input" ||
        tag === "textarea" ||
        (target != null && target.isContentEditable);
      if (isTypingContext) return;

      if (isWaitingForPayload) return;

      if (e.key === "4") {
        focusCustomInput();
        e.preventDefault();
        return;
      }

      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const idx = Number(e.key) - 1;
        const choice = choicesList[idx] ?? "";
        if (choice.trim().length === 0) return;
        onChoiceSelected(idx, choice);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choicesList, isWaitingForPayload, onChoiceSelected, focusCustomInput]);
}

