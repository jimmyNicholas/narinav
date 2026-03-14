import NarinavClient from "./NarinavClient";

export default function Home() {
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
            Narinav
          </h1>
          <p className="text-secondary leading-relaxed text-sm">
            An interactive story-building companion. Co-write a story with Claude.
          </p>
        </div>
      </header>

      <NarinavClient />
    </>
  );
}
