import type { Metadata } from "next";
import StoryBuddyClient from "./StoryBuddyClient";

export const metadata: Metadata = {
  title: "Story Buddy | Jimmy Nicholas",
  description: "An interactive voice-powered story companion.",
};

export default function StoryBuddyPage() {
  return (
    <>
      <header
        className="border-2 border-secondary rounded-3xl p-6 md:p-8 space-y-5"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--palette-background) 88%, var(--palette-secondary) 12%)",
        }}
      >
        <div className="space-y-2">
          <h1 className="font-mono font-bold text-themed text-2xl md:text-3xl">
            Story Buddy
          </h1>
          {/* <p className="text-secondary leading-relaxed">
            An interactive voice-powered story companion. Chat to build a story
            together.
          </p> */}
        </div>
      </header>

      <StoryBuddyClient />
    </>
  );
}
