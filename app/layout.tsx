import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Narinav | Story Buddy",
  description: "An interactive story-building companion powered by Claude.",
};

const narinavThemeVars: CSSProperties = {
  "--palette-background": "#0F1117",
  "--palette-text": "#E8E6F0",
  "--palette-primary": "#A78BFA",
  "--palette-secondary": "#6B7280",
  "--palette-accent": "#F59E0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="max-w-8xl mx-auto px-6 py-4" style={narinavThemeVars}>
          <div className="rounded-[40px] bg-themed ring-1 ring-black/5 p-3 sm:p-4">
            <main
              className="rounded-[32px] bg-white ring-1 ring-black/10 shadow-sm p-4 sm:p-5 space-y-4"
              role="main"
              aria-label="Narinav story workspace"
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
