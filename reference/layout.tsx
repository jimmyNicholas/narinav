import type { CSSProperties, ReactNode } from "react";

export default function StoryBuddyLayout({ children }: { children: ReactNode }) {
  const storyBuddyThemeVars = {
"--palette-background": "#0F1117",  // near-black with blue undertone
"--palette-text": "#E8E6F0",        // soft lavender-white
"--palette-primary": "#A78BFA",     // violet-400 (glows on dark)
"--palette-secondary": "#6B7280",   // muted mid-gray
"--palette-accent": "#F59E0B",      // amber — like candlelight
  } as CSSProperties;

  return (
    <div className="max-w-8xl mx-auto px-6 py-4" style={storyBuddyThemeVars}>
      <div className="rounded-[40px] bg-themed ring-1 ring-black/5 p-3 sm:p-4">
        <main
          className="rounded-[32px] bg-white ring-1 ring-black/10 shadow-sm p-4 sm:p-5 space-y-4"
          role="main"
          aria-label="Story Buddy interactive workspace"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

