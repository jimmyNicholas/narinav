# Narinav project – plan and context

Use this document in the Narinav repo so the project (and any tooling/AI) has full context.

---

## Project context

- **What Narinav is**: A standalone replacement for **Story Buddy**. Story Buddy was a portfolio project that used Voiceflow for the conversation and game loop. Narinav reimplements the same kind of experience by calling **Claude** (or later OpenAI) directly via API, with the game logic and loop in our own code.
- **Source of reference**: The UI and patterns come from the **Story Buddy** code that lived in another repo at `src/app/work/story_buddy/`. Those files have been **imported into this project as reference** under `reference/`. Use them for layout, components, and types—not the Voiceflow-specific hooks.
- **Stack**: Next.js (App Router), TypeScript, Tailwind. No static export; we need server-side API routes for Claude so the API key stays secret.
- **Node version (this project only)**: **24.13.0**. Pin it via `.nvmrc` and/or `engines` in `package.json` so CI and cPanel use this version.

---

## Deployment target

- **cPanel** with auto-deploy (e.g. Git Version Control + `.cpanel.yml`). Narinav needs **Node.js** on the server (no static-only export) so the Claude API route can run. Configure cPanel's "Setup Node.js App" (or equivalent) to run this app and set `ANTHROPIC_API_KEY` in the Node app's environment.

---

## Build order (quick path)

1. **Pin Node 24.13.0**
   - Add `.nvmrc` with `24.13.0`.
   - In `package.json`, set `"engines": { "node": "24.13.0" }` (or `"^24.13.0"` if you allow patch).

2. **Claude API and one page**
   - **Env**: `.env.local` with `ANTHROPIC_API_KEY`; ensure `.env*` is in `.gitignore`.
   - **Server**: One endpoint that calls Claude and returns text:
     - **Option A**: API route at `app/api/chat/route.ts` — POST body `{ "message": "..." }`, call Anthropic Messages API, return `{ "text": "..." }`.
     - **Option B**: Server Action in e.g. `app/actions.ts` — `"use server"` function that accepts a string, calls Claude, returns the assistant text.
   - **Dependency**: Add `@anthropic-ai/sdk` (or use raw `fetch` to `https://api.anthropic.com/v1/messages`).
   - **UI**: One page (e.g. `app/page.tsx`) with a form/button that sends a prompt to that endpoint and displays the response (and errors).
   - **Goal**: Run the app locally, trigger the call, see Claude's reply.

3. **Use the reference UI**
   - Reference files (Story Buddy panels, utils, layout) are in `reference/`. When implementing the real Narinav UI, reuse those components and styles (Tailwind classes, layout, `storyBuddyUtils` types/parsing). Replace Voiceflow-driven state with our own state and API calls to the new chat endpoint.

4. **Game loop and logic**
   - Recreate the Story Buddy flow in our code: turns, choices, story-so-far, message-to-player, final story. Drive it from Claude's responses (structured or parsed) and local state. No Voiceflow.

5. **cPanel auto-deployment**
   - **Repo**: Connect this repo in cPanel Git Version Control (branch e.g. `main`, deploy path as required).
   - **.cpanel.yml**: Tasks: `npm ci`, `npm run build`. Ensure the Node.js app runs from the repo directory with `next start` (or the configured start script).
   - **Env on cPanel**: Set `NODE_ENV=production` and `ANTHROPIC_API_KEY` in the Node.js app's environment in cPanel.
   - **Docs**: Add a short `CPANEL_DEPLOYMENT.md` (or section in README) describing Node version (24.13.0), env vars, and deploy steps.

---

## Out of scope for the initial plan

- OpenAI (can add later as an alternative backend).
- Full parity with every Voiceflow edge case; ship a working loop first.

---

## File reference (this repo)

- **Claude API**: `app/api/chat/route.ts` (or Server Action in `app/actions.ts`).
- **First page**: `app/page.tsx`.
- **Reference UI / types**: `reference/StoryBuddyPanels.tsx`, `reference/storyBuddyUtils.ts`, `reference/layout.tsx`, `reference/StoryBuddyClient.tsx`, `reference/page.tsx` — use for layout and components; replace Voiceflow with own state and chat API.
- **Node**: `.nvmrc` and `package.json` `engines` for 24.13.0.
