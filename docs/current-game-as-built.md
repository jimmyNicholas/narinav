# The current game, as built

What the game on `main` actually does, written up as a design rather than as code. Drawn from `app/`, `lib/` and `app/api/story/prompts/` at the commit this file was added on. File references are `path:line` so each claim can be checked. Where the code's behaviour is uncertain (it depends on what the model returns), that is flagged.

This is evidence from the prototype for the needs analysis (issue #12). It describes, it does not recommend.

## Summary

The player builds a story one sentence at a time. Each turn Claude offers three short suggestions ("beats"); the player picks one or types their own; Claude then writes three versions of that beat as a full sentence ("renderings"); the player picks one, optionally edits it, and adds it to the story. A hidden "story bible" (Claude-maintained notes on characters, places, threads and tone) is updated after each sentence and fed back into later prompts. Partway through, the player is asked to either end the chapter in a fixed number of turns or keep writing. When the turn budget runs out, Claude assembles the sentences into a polished short story.

Five Claude prompts drive it: an input classifier, the Beat Bot, the Refinement Bot, the Story Bible updater, and the Final Story Bot. All run through one server route, `app/api/story/route.ts`, behind a login.

## Turn loop

Default length is 20 turns (`lib/constants.ts:5`); the player can set 5 to 30 in the options panel (`app/NarinavOptionsPanel.tsx:13-14`). One turn adds one sentence.

A normal turn:

1. **Beat choice.** The player sees three beats from the Beat Bot, plus a free-text box (`app/NarinavClient.tsx:1254-1294`). They can refresh the beats twice per turn (`app/NarinavClient.tsx:862-896`, reset at `:775`).
2. **Classify (typed input only).** If the player types their own beat, the classifier labels it and may clean it up before it goes on (`app/NarinavClient.tsx:639-640`). Clicked beats skip this and are tagged `pre_generated` (`app/NarinavClient.tsx:469-474`).
3. **Refinement.** The Refinement Bot returns three one-sentence renderings of the beat (`app/NarinavClient.tsx:469-492`). The first rendering is pre-loaded into an edit box.
4. **Pick and edit.** The player picks a rendering, may edit it, and presses "Add to my story". The edited text must fall within the refinement word range (default 12 to 20 words, `lib/constants.ts:16-17`) or it is refused (`app/NarinavClient.tsx:820-833`). The player can also "Remove this beat" and go back to the beat choice (`app/NarinavClient.tsx:856-860`).
5. **Commit.** The sentence is appended and the turn counter advances (`app/NarinavClient.tsx:686-696`). The client then checks, in order: turn budget used up (end), chapter countdown reached zero (end), "keep writing" countdown reached zero (decision), natural ending flagged (interrupt), decision moment reached (decision) (`app/NarinavClient.tsx:702-737`).
6. **Bible, then next beats.** If none of those fired, the Story Bible updater runs on the last five sentences, its delta is merged into the bible, and then the Beat Bot is called for the next turn (`app/NarinavClient.tsx:739-787`). These two calls run one after the other while the player waits.

So a clicked-beat turn costs three Claude calls (refinement, bible, beats) and a typed-beat turn costs four.

**What Claude sees.** For the first three turns the prompts get the whole story; after that only the last three sentences (`app/api/story/route.ts:43-50`, `lib/constants.ts:11`). Everything older reaches Claude only through the story bible. The Final Story Bot is the only prompt that sees every sentence (`app/api/story/route.ts:530`).

## Modes

The game has four modes (`lib/navinavTypes.ts:5`). Each changes which prompt blocks the Beat Bot and Refinement Bot get.

- **Open** (sentences 1 to 3). The "genre vote" phase. Beats aim at three different kinds of story; renderings are forced into three fixed shelves: mundane-realist, literary, uncanny (`app/api/story/prompts/refinementBot.ts:57-184`). The bible updater records only concrete facts and must not create threads (`app/api/story/prompts/storyBible.ts:14-138`). The client switches to continue once three sentences are in (`app/NarinavClient.tsx:698-700`). On the server, the Beat Bot can leave open mode early if the bible says `opening_complete` (`app/api/story/route.ts:59-63`, `:333-338`); the Refinement Bot cannot, because the client always sends its own mode.
- **Continue** (sentence 4 until a decision). Beats are picked from a menu of purposes (answer a thread, deepen, pause, interior thought, and so on) grounded in the bible (`app/api/story/prompts/beatBot.ts:122-183`). Renderings use only the shared rules, with no fixed shelves (`app/api/story/prompts/refinementBot.ts:284-286`). Choosing "Keep writing" at a decision also puts the game back in continue, now with an 8-turn countdown (`app/NarinavClient.tsx:905-908`, `lib/constants.ts:9`).
- **Chapter** (after choosing "End this chapter"). A 5-turn countdown to a cliffhanger (`app/NarinavClient.tsx:901-904`, `lib/constants.ts:8`). Beats heighten tension and must not resolve anything (`app/api/story/prompts/beatBot.ts:195-199`); renderings build toward one unresolved moment (`app/api/story/prompts/refinementBot.ts:193-199`).
- **Ending** (resolve the story, generate a moral). Fully written in the prompts (`app/api/story/prompts/beatBot.ts:187-191`, `app/api/story/prompts/refinementBot.ts:186-191`) but **unreachable**: nothing in the client ever sets mode to `"ending"` (the only `setMode` calls are at `app/NarinavClient.tsx:297,353,699,902,906`). There is no "end the story" option at the decision screen.

## Decision moments

The player makes four kinds of choice.

- **Every turn: what happens.** Pick one of three beats, refresh them (2 per turn), or type a beat of up to 30 words (`app/NarinavOptionsPanel.tsx:24`).
- **Every turn: how it sounds.** Pick one of three renderings and optionally rewrite it within the word range.
- **Structural decision at 60%.** When the story reaches 60% of the turn budget (sentence 12 of 20), the game stops and asks "Your story is finding its shape. What do you want to do with it?" with two buttons: "End this chapter, 5 turns to reach a cliffhanger" or "Keep writing, 8 more turns, then decide again" (`app/NarinavClient.tsx:729-733`, `:1089-1132`, `lib/constants.ts:6`).
- **Second decision at 80%.** If the player kept writing, a second decision fires at 80% (sentence 16 of 20) with only the chapter option (`app/NarinavClient.tsx:734-737`, `:1092`). Note that this arrives 4 turns into the promised 8, so "8 more turns, then decide again" is not what happens with the default length.
- **Natural-ending interrupt.** If the Refinement Bot set `natural_ending_detected`, after the sentence is committed the player is offered "End the chapter here" or "Keep writing" (`app/NarinavClient.tsx:724-728`, `:1133-1170`). The prompt never explains when to set this flag; it only appears as `false` in the example JSON (`app/api/story/prompts/refinementBot.ts:262-270`). How often it fires is therefore uncertain, probably rarely.

**Agency lock.** When two or fewer turns remain on a countdown, the free-text beat box disappears and renderings can no longer be edited, only picked ("Two turns left. The choices are set, pick one.") (`app/NarinavClient.tsx:270-273`, `:820-831`, `:1278`; `app/NarnavPanels.tsx:609-613`). The message says "Two turns left" on the last turn too.

## Ending pressure

The story ends in one of three ways:

1. **Turn budget used up.** At `maxTurns` the final story is generated whatever the mode (`app/NarinavClient.tsx:702-705`). This check runs first.
2. **Chapter countdown reaches zero** (`app/NarinavClient.tsx:706-715`).
3. **Player accepts the natural-ending interrupt** (`app/NarinavClient.tsx:915-924`).

Inside a chapter countdown, an `ending_pressure` level from 0 to 3 is computed from turns remaining: 0 when more than 4 remain, 1 at 3 or 4, 2 at 2, 3 on the last turn (`app/api/story/route.ts:52-57`, duplicated in `app/NarinavClient.tsx:66-76`). It is sent to the Refinement Bot only in chapter (or ending) mode. At pressure 1 to 2 the prompt asks it to build toward the break; at 3 every rendering must read like a chapter ending and it must also return a `chapter_bible` for the next chapter (`app/api/story/prompts/refinementBot.ts:193-199`, `:267-270`). At pressure 3 the Beat Bot is skipped, since there is no next turn (`app/NarinavClient.tsx:519-538`).

The Beat Bot gets a separate, softer signal: `narrative_position` (turns so far divided by max turns). In continue mode, above 0.7 it is told to weight toward answering threads and pausing over opening new ones (`app/api/story/prompts/beatBot.ts:147`).

How the paths play out with the default 20 turns:

- **Chapter at the first decision:** sentences 13 to 17 run at pressure 0, 1, 1, 2, 3; the chapter ends after sentence 17 with a cliffhanger and a next-chapter bible. This path works as designed.
- **Keep writing, then chapter at the second decision:** sentences 17 to 20 run at pressure 0, 1, 1, 2, and then the turn budget ends the game. Pressure never reaches 3, so the final sentence is never written as a chapter ending and no next-chapter bible is produced.
- **Keep writing:** there is no way to skip the second decision; it always fires at 80%, and its only option is the chapter.

## Prompts

All prompts are in `app/api/story/prompts/`. Each is a system prompt plus a short user message of labelled fields. All ask for JSON only, parsed leniently (`app/api/story/anthropic.ts:51-59`). The audience is fixed in the prompts as Grade 6, ages 11 to 12 (`app/api/story/prompts/refinementBot.ts:85`, `app/api/story/prompts/storyBible.ts:21-25`).

Models: in production, game prompts use Claude 3.5 Haiku and the final story uses Claude Sonnet 4; in dev mode everything uses Claude 3 Haiku (`lib/constants.ts:22-26`, `app/api/story/route.ts:38-41`). **Dev mode is on by default** (`app/NarinavOptionsPanel.tsx:39`, `:75`), so unless a player turns it off, every call, including the final story, uses Claude 3 Haiku.

### Input classifier

`app/api/story/prompts/inputClassifier.ts:3-32`

- **Asks Claude to:** label a typed beat as `bare_beat` (plain action, the default when unsure), `crafted_prose` (deliberate literary sentence), `gibberish` or `non_english`. Then pass bare beats through untouched, fix only spelling and punctuation in crafted prose, turn gibberish into a "chaotic beat the story can absorb", and leave non-English untranslated.
- **Inputs:** the raw player text.
- **Output:** `{ input_type, cleaned_input, notes }`.
- **Used:** only for typed beats in the main loop. The opening screen's typed input never reaches it (see Observations).

### Beat Bot

`app/api/story/prompts/beatBot.ts`

- **Asks Claude to:** suggest exactly three next actions, 6 to 12 words each, as short phrases not sentences (`:13-21`). Hard rules: simple kid verbs, no abstract phrasing, and content-safety rules that steer unsafe directions toward getting help or leaving (`:23-34`).
- **Open block (`:41-118`):** choose three different "purposes" from a menu (sensation, memory, impulse, intrusion, absence, threshold, voice) that imply three different trajectories (inward, outward, relational) and three different kinds of story. Each beat must "yes, and" the latest sentence, imply a concrete who, what or where, and not invent places or characters the bible has not confirmed. The route strips threads from the bible before this call so the opening does not chase them (`app/api/story/route.ts:343-349`).
- **Continue block (`:122-183`):** choose three purposes from a different menu (answer, deepen, new, pause, peripheral, interior, action), at most one answer per turn, vary emotional register across the three, stay within one or two spaces implied by the bible.
- **Ending block (`:187-191`):** resolution-oriented actions, no new threads. Unreachable.
- **Chapter block (`:195-199`):** heighten tension, resolve nothing.
- **Inputs:** story bible (JSON), recent story, narrative position, mode (`:224-234`).
- **Output:** `{ next_beats: [three strings] }`.

### Refinement Bot

`app/api/story/prompts/refinementBot.ts:19-317`

- **Asks Claude to:** turn the chosen beat into three one-sentence renderings, 12 to 20 words each, that differ clearly in tone (`:19`, `:203-258`). Keep continuity with the bible, do not restate known facts, turn vague actions ("explore") into arrival at something specific, never echo the bible's tone words, write at a Grade 6 reading level, and apply the same content-safety rules as the Beat Bot (`:26-53`).
- **Open block (`:57-184`):** the three renderings are three fixed shelves: [0] mundane-realist (plain, physical, keeps at least three of the player's own words), [1] literary (one image plus an unstated feeling), [2] uncanny (one plainly stated wrong fact). No named characters, no place or era names unless the player used them. Crafted prose is preserved in rendering [0].
- **Continue:** shared base and rules only; tones are left to the model.
- **Chapter block (`:193-199`):** do not resolve threads; at pressure 3, also write a full `chapter_bible` for the next chapter with a one-sentence `cliffhanger_summary`.
- **Ending block (`:186-191`):** resolve threads; at pressure 3, write a moral under 20 words. Unreachable.
- **Inputs:** story bible, recent story, mode, input type, cleaned player input, and in chapter or ending mode also turns remaining, ending pressure, and close type (`:294-317`).
- **Output:** `{ renderings: [three strings], natural_ending_detected, moral?, chapter_bible? }`.

### Story Bible updater

`app/api/story/prompts/storyBible.ts`

- **Opening version (`:14-138`), used while the client mode is open:** record only what is concretely established: tone (2 to 3 specific adjectives), places only if named or clearly acted on, objects only if touched or named, characters only if introduced (never the narrator), narrator voice, register (mundane, literary, uncanny, playful) and interiority, and story trajectory. Set `opening_complete` when tone, register and at least one anchor exist, and list what is `missing`. No threads.
- **Full version (`:142-203`), used afterwards:** return only what changed. Track threads with status new, open or resolved, keep only the last five resolved, pick one `primary_thread`. Add any character or animal that acts, replace vague entries once they are identified, and update genre, style and world rules only on a clear shift.
- **Inputs:** current bible and the last five sentences, numbered (`:207-220`, `app/api/story/route.ts:467-470`).
- **Output:** `{ story_bible_update: { ...changed keys } }`, merged on the client: characters, places and objects by name, threads replaced wholesale (`lib/navinavTypes.ts:194-243`).

### Final Story Bot

`app/api/story/prompts/refinementBot.ts:321-351`

- **Asks Claude to:** assemble all committed sentences into a polished short story in paragraphs. Keep every sentence the player chose, add only small connecting words or phrases, add no plot. In "story" mode resolve threads; in "chapter" mode leave them open. Write a title and a `preview_sentence`.
- **Inputs:** mode, story bible, every committed sentence, and the moral as background.
- **Output:** `{ title, story, preview_sentence }`. The client shows title and story; `preview_sentence` is unused.

## What the player sees

The whole app sits behind a username and password login, with test users configured on the server (`middleware.ts:5-43`, `app/api/auth/login/route.ts:26-37`). A header shows the name, a "Dev mode" badge when on, a "New story" button (full page reload), and a cog that opens the options panel (`app/NarinavHeader.tsx:54-133`).

1. **Welcome.** Four cards (overview, how it works, an example story "The Gnome Whisperer", and an empty card) and two buttons: "Start a new story" and "Continue a story" (`app/NarnavPanels.tsx:324-426`).
2. **Loading.** "Connecting to Story Buddy…" with a spinner, shown for every wait between screens; on failure it becomes "Something went wrong" with "Try again" (`app/NarnavPanels.tsx:268-315`).
3. **Opening.** "Where does your story begin? Type a sentence, a fragment, or just a feeling. Or choose one of these to get started:" with three Beat Bot opening beats (or three fixed fallbacks if the call fails, `app/NarinavClient.tsx:231-235`) and a "Start" text box (`app/NarnavPanels.tsx:501-566`).
4. **Refinement.** Left: "Story so far" as a bulleted list, "Turn N of M", and the chosen beat in a bubble with "Remove this beat, back to choices". Right: "Here's how that could sound", three rendering cards (no tone labels), an edit box with word count, "Clear input", and "Add to my story →" (`app/NarnavPanels.tsx:60-123`, `:584-670`).
5. **Beat choice.** Left: story so far. Right: a header ("What happens next?" in open mode, "Keep going. (N turns left)" in continue, "Build to the break. (N turns left)" in chapter), three beat buttons, "Refresh (N)", and "Or type your own action..." (`app/NarinavClient.tsx:1245-1294`, `app/NarnavPanels.tsx:138-241`).
6. **Decision.** "Your story is finding its shape." with one or two buttons (`app/NarinavClient.tsx:1089-1132`).
7. **Natural-ending interrupt.** "This feels like a good place to break." with "End the chapter here" or "Keep writing, N turns left" (`app/NarinavClient.tsx:1133-1170`).
8. **Final story or chapter.** Heading "Final story" or "Chapter", the generated title and story, "What happens next is up to you." for a chapter, and buttons "Copy", "Start a new story", and (chapter only, if a next-chapter bible came back) "Copy story bible for Chapter N" (`app/NarinavClient.tsx:1171-1242`).
9. **Continue a story.** A text area: "Paste your story bible JSON from a previous chapter below." Loading it shows "Welcome back.", the title and summary, and "Begin Chapter 2". The first sentence is generated from the bible's summary in open mode, then the loop starts again from turn 0 (`app/NarinavClient.tsx:332-393`, `:978-1023`).

Errors outside the loading screen appear as a modal whose "Try again" button only closes it; it does not retry (`app/NarinavClient.tsx:1301-1306`).

## Observations

### Looks like it works well

- **A clear two-step turn: what happens, then how it sounds.** Separating the beat (player directs) from the rendering (Claude writes) gives a child real authorship over events while Claude carries the prose. The player can always override both by typing or editing (`app/NarinavClient.tsx:1276-1287`, `app/NarnavPanels.tsx:630-660`).
- **The opening as a "genre vote".** Three fixed shelves (mundane, literary, uncanny) for the first three sentences is a strong, testable idea for letting the player discover what kind of story they want without being asked about genre. The prompt gives concrete pass and fail examples for each shelf (`app/api/story/prompts/refinementBot.ts:64-151`).
- **Keeping the opening clean of threads.** The route strips threads out before the opening Beat Bot call rather than asking the model to ignore them, and the opening bible updater is forbidden from inventing mysteries (`app/api/story/route.ts:343-349`, `app/api/story/prompts/storyBible.ts:109-116`). This addresses a real failure mode (early "thread chasing") with a structural fix.
- **The story bible as long-term memory.** Prompts only see the last three sentences, so a structured, merged bible (threads with status, a primary thread, characters by name) keeps continuity cheap. The merge never wipes fields that a delta leaves out (`lib/navinavTypes.ts:194-243`).
- **Purpose menus for beats.** Making the Beat Bot pick three distinct purposes before writing, with a "yes, and" rule tied to the latest sentence, is a good way to get three genuinely different options rather than three moods of one (`app/api/story/prompts/beatBot.ts:46-108`, `:127-176`).
- **Chapter path, when taken at the first decision.** Pressure ramps 0, 1, 1, 2, 3 over five turns, the last two lock choices, and the final sentence plus next-chapter bible are produced together. This is the one complete ending path.
- **Safety and readability rules are explicit and repeated** in both generating prompts (`app/api/story/prompts/beatBot.ts:23-34`, `app/api/story/prompts/refinementBot.ts:30-37`, `:250-255`).
- **A prompt test harness exists** for the classifier, Beat Bot (open, continue), Refinement Bot (open, continue) and both bible updaters (`tests/prompts/runner.ts:3-9`). Chapter, ending and final-story prompts are not covered.

### Looks like it works badly

- **The "end the story" path does not exist.** Ending mode and the moral are fully prompted but no code sets mode to `"ending"`, and the decision screen only offers "End this chapter" or "Keep writing" (`app/NarinavClient.tsx:898-913`, `:1106-1129`). The welcome text promises "end the story, end the chapter, or keep writing" (`app/NarnavPanels.tsx:372-373`). Every complete story either ends as a cliffhanger chapter or is cut off by the turn budget.
- **Stories cut off by the turn budget get no ending pressure.** If the player keeps writing, the second decision lands 4 turns before the budget, the chapter countdown never reaches pressure 3, and the game simply stops at turn 20 (`app/NarinavClient.tsx:702-705`, `:734-737`). The last sentence is not written as an ending and no next-chapter bible is made, so "Copy story bible" does not appear. The Final Story Bot is then sent mode `"continue"`, which matches neither of the modes its prompt knows ("story" or "chapter") (`app/api/story/prompts/refinementBot.ts:329-330`, `app/NarinavClient.tsx:665-670`).
- **Stale beats after a decision or interrupt.** When the decision screen or natural-ending interrupt fires, the commit returns before the bible update and the next Beat Bot call (`app/NarinavClient.tsx:716-737`). Choosing an option then goes straight to the beat choice screen, which still shows the three beats from the turn just played (`app/NarinavClient.tsx:910`, `:920`). The bible also misses that sentence until the next update.
- **Chapter-mode beats lag one sentence behind.** In chapter mode the next beats are fetched while the player is still choosing a rendering, using the story before that sentence is added (`app/NarinavClient.tsx:519-536`), and the bible update runs in the background without being waited for (`app/NarinavClient.tsx:788-803`).
- **Misleading counters and labels.**
  - In continue mode before any decision the header reads "Keep going. (0 turns left)" for sentences 4 to 12, because there is no countdown yet (`app/NarinavClient.tsx:1250-1251`).
  - At the second decision the chapter button says "8 turns to reach a cliffhanger" (it reuses the continue countdown), but the chapter is set to 5 (`app/NarinavClient.tsx:1090`, `:903`).
  - "Keep writing, 8 more turns, then decide again" is cut short to 4 at default length.
  - The natural-ending interrupt can say "0 turns left" before any countdown exists (`app/NarinavClient.tsx:1166`).
  - "Begin Chapter 2" is always 2, because the bible has no chapter field (`app/NarinavClient.tsx:357-359`, `:966`).
  - The agency-lock message says "Two turns left" on the last turn as well.
- **The welcome copy does not match the game.** It says 15 to 25 turns (default is 20, range 5 to 30), beats of 8 to 18 words (prompt asks for 6 to 12; typed input allows up to 30), renderings of 15 to 25 words (12 to 20), and keyboard shortcuts 1 to 4 that are not implemented (`app/NarnavPanels.tsx:345-356`, `:368-374`; no key handler exists in `app/`). The loading screen still says "Connecting to Story Buddy…" (`app/NarnavPanels.tsx:307`).
- **Typed opening input is never classified.** The opening screen sends any non-empty text straight to the Refinement Bot as `pre_generated`; the classify branch below it can only run on empty text, which is blocked earlier (`app/NarinavClient.tsx:426-436`, `:448-450`). So gibberish, non-English, or crafted prose in the first sentence get none of the classifier's handling, and the open-mode rules for crafted prose never trigger on turn 0.
- **Opening mode is decided in two places that can disagree.** The Beat Bot can leave open mode as soon as the bible reports `opening_complete`, but the Refinement Bot and bible updater stay in open mode until three sentences are in (`app/api/story/route.ts:333-338` versus `app/NarinavClient.tsx:698-700`). The player can get continue-style beats rendered through the three open-mode shelves.
- **Point of view mismatch.** Beats are written in second person ("you pick up the envelope", `app/api/story/prompts/beatBot.ts:55`, `:86-96`), while rendering examples are first person ("I held my breath", `app/api/story/prompts/refinementBot.ts:74-78`). Nothing sets a point of view until the full bible updater might fill `style_guidelines.pov`.
- **Open-mode rules fight the player.** Renderings in the first three sentences may not name characters or places unless the player did (`app/api/story/prompts/refinementBot.ts:180-182`). On "Continue a story", the first sentence is also generated in open mode, so a bible full of named characters is rendered under a "no named characters" rule (`app/NarinavClient.tsx:368-376`).
- **Prompt self-contradictions.** The Beat Bot base forbids "reckon with" as abstract, but the continue block's own example uses "reckon with the fact that you are talking to a cat" (`app/api/story/prompts/beatBot.ts:25` versus `:175`). The open block's examples use PAUSE and PERIPHERAL, which are not on the open menu (`app/api/story/prompts/beatBot.ts:93-96`). Refinement rule 8's example ("With confidence, I reached for the doorknob and gently turned it.") is the adverb-heavy style the other rules discourage (`app/api/story/prompts/refinementBot.ts:257-258`). The open-mode rules (2b, 3b) are also sent in continue and chapter mode, labelled "OPEN mode" (`app/api/story/prompts/refinementBot.ts:208-235`, `:284-289`).
- **Word-count gate on renderings.** A rendering the model writes outside the configured range cannot be added until the player edits it (`app/NarinavClient.tsx:825-830`). Model word counts are approximate, so this likely causes friction, though how often depends on model output (uncertain). Changing the word limits in the options panel changes only the client check, not the prompts, which use the fixed constants (`app/NarinavClient.tsx:287-291` versus `app/api/story/prompts/refinementBot.ts:256`). The "Beat words" options are displayed but used nowhere.
- **Limits that do not limit.** "Remove this beat" decrements a counter of 2, but every new set of renderings resets it to 2, so it is effectively unlimited (`app/NarinavClient.tsx:485`, `:857`). Removing the beat on the very first turn lands on a beat-choice screen with three empty buttons, because opening beats are held separately (`app/NarinavClient.tsx:302`, `:859`).
- **Dev mode is the default.** Every call, including the final story, uses Claude 3 Haiku unless the player finds the cog and switches it off (`app/NarinavOptionsPanel.tsx:39`, `:75`). Options are per-browser in local storage.
- **Loose ends that carry over.** "Start a new story" does not clear a previous game's moral, chapter bible or final title (`app/NarinavClient.tsx:293-307`), so in principle a stale "Copy story bible" could appear after a later story. Bible update failures are silently ignored (`app/NarinavClient.tsx:757-759`, `:801`). Rendering tone labels are wired to the panel but always blank (`app/NarinavClient.tsx:379`, `app/NarnavPanels.tsx:570`).
- **Slow turns.** Each committed sentence waits on two Claude calls in a row (bible update, then beats) before the next choice appears, behind a full-screen "Connecting to Story Buddy…" panel (`app/NarinavClient.tsx:739-787`).

### Leftovers outside the game

`app/api/chat/route.ts` is the original single-prompt test endpoint from the build plan; the game does not call it. It is still reachable by logged-in users through the middleware (`middleware.ts:17-20`).
