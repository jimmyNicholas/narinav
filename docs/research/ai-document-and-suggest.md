# How does AI document and suggest without taking over?

Research for [issue #16](https://github.com/jimmyNicholas/narinav/issues/16). Gathered 10 October 2026.

The question: what do studies and practice say about AI as a chronicler and suggester in player-directed play (AI Dungeon, AI game masters, AI co-writing tools such as Sudowrite, NovelAI, Wordcraft and Dramatron)? What keeps the player in charge, what takes over, and what do players value or reject? Two sub-questions: **tracking devices** (how AI tools keep track of a story and how visible and editable that is) and **branching paths for suggestions** (one continuation, several options, questions back, rerolls, and what each does to the player's sense of authorship).

The reading is aimed at the ranked needs from the needs analysis (issues #18, #19, #20), all from secondary evidence.

## How claims were verified

Direct page fetches were blocked again. The proxy refused the CONNECT to arxiv.org (HTTP 403, "policy denial"), and the fetch tool could not resolve arxiv.org or help.aidungeon.com. **No source below was opened and read in full.** Every claim was checked against web-search result snippets that quote or paraphrase the linked page. Read each citation as "the search snippet says this page says this", and open the page before quoting it anywhere that matters. Where a snippet came from a third-party summary rather than the page itself, the citation says so.

Source tags:

- **[study]**: peer-reviewed paper, workshop paper, preprint or thesis with participants.
- **[paper, conceptual]**: academic argument without a user study.
- **[docs]**: the product's own help pages, documentation or changelog.
- **[press]**: journalism or interviews.
- **[anecdote]**: forum or community posts. Practice evidence, not data.

Earlier findings were mined and are not repeated here except where this note adds to them:

- Survey of player-directed story games (branch `research/player-directed-story-games`), cited as "earlier survey".
- Writer needs (branch `research/writer-needs`), cited as "writer needs" with its need or lead number.
- Journaling RPG player needs (branch `research/journaling-rpg-player-needs`), cited as "player needs" with P1 to P14.
- Current game write-up (branch `task/current-game-as-built`), cited as "current game write-up". Used only in the last section.

Rule applied: a **finding** has at least two independent sources (sources with a shared origin count as one). Anything with one source is a **lead**.

## Summary

- **Tracking in commercial tools is layered, visible and player-maintained.** Always-on core facts, keyword-triggered entries, and running summaries. Players can read and edit all of it, and the better tools show what was actually sent to the model. The upkeep is the player's job.
- **Marking whose words are whose is now ordinary practice** (NovelAI colours text by source; Sudowrite marks inserted AI text until it is edited), and the one study of it found it helped writers keep a sense of ownership.
- **The more text the AI writes per step, the less the writer feels the work is theirs.** This is the best-supported result in the reading, from several independent studies.
- **AI that proposes where the story goes tends to take over;** AI used as raw material, a brainstorming partner or a source of details tends not to.
- **Rerolls and edits make the player a curator** of AI output rather than its author; the tools treat this as a core control.
- **An AI game master fails in two directions:** too compliant (the story goes slack, nothing resists) or railroading (the player loses freedom). In-world consequences beat flat refusals.
- **LLM help makes outputs more alike across people,** from three independent studies.
- **No study compares one suggestion against several on authorship.** The evidence on number of options is indirect.

## Findings

### Tracking devices

**1. Commercial tools split the story record into three layers: always-on core facts, keyword-triggered entries, and running summaries.**

- AI Dungeon: *Plot Essentials* (formerly "Memory") sits at the start of the context and holds the most important facts; *Story Cards* (formerly "World Info") enter the context only when one of their trigger words appears in recent actions; *Auto Summarization* rewrites a *Story Summary* every 15 actions when switched on; the *Memory Bank* stores AI-written memories of past events and retrieves them ranked by relevance to the latest action. [docs: [Memory System](https://help.aidungeon.com/faq/the-memory-system); [Plot Components](https://help.aidungeon.com/faq/plot-components); [What goes into the Context](https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai); [Story Cards (Notion help)](https://latitudegames.notion.site/What-are-Story-Cards-12227c6d39214d7b850b828dd6ef3c4e)] About 25% of remaining context goes to matching Story Cards, chosen by how recently and often their triggers were used. [docs: Story Cards page, same link]
- NovelAI: each *Lorebook* entry has activation keys; when a key appears in recent text the entry is inserted into context. Keys are case-insensitive, can be regular expressions, can require several keys together, or can be set Always On. The entry title is not seen by the AI. [docs: [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)] *Memory* and *Author's Note* are separate fields; Author's Note is inserted much closer to the recent text than Memory by default. [docs: [Story Settings](https://docs.novelai.net/en/text/editor/storysettings)]
- Sudowrite: the *Story Bible* holds Braindump, Genre, Style, Synopsis, Characters, Worldbuilding, Outline and Scenes; each section feeds the generation of the next (Braindump and Genre inform Synopsis; Synopsis informs Characters, Worldbuilding, Outline and Scenes). [docs: [Sudowrite glossary](https://docs.sudowrite.com/getting-started/dQph1snuwbfMWG9wRjsNug/glossary/1Symu5y4wtu65nQVYHjhxa); [What is Story Bible](https://feedback.sudowrite.com/help/articles/1671191-what-is-story-bible)]
- Research systems use the same split. The agentic solo game master in the ChatRPG study gave continuity its own "Archivist" agent tracking game state and history, separate from the "Narrator". [study: [Static vs Agentic Game Master AI, arXiv 2502.19519](https://arxiv.org/abs/2502.19519)] CALYPSO distils game context into short prose for a human game master. [study: [Zhu et al., AIIDE 2023](https://ojs.aaai.org/index.php/AIIDE/article/view/27534)]

**2. The record is visible and player-editable, and the better tools show what was actually sent to the model.**

- NovelAI's *Context Viewer* shows how Lorebook entries, Memory, Author's Note and phrase biases are placed, stage by stage, and can list entries that did not activate. [docs: [NovelAI Advanced Settings](https://docs.novelai.net/en/text/editor/advancedsettings)]
- AI Dungeon has a Context Viewer showing how many tokens each element uses; Story Cards can be exported and imported as JSON; its New Player Guide says memories can be viewed and edited. [docs: [Story Cards](https://latitudegames.notion.site/What-are-Story-Cards-12227c6d39214d7b850b828dd6ef3c4e); [New Player Guide](https://latitudegames.notion.site/New-Player-Guide-2c8105b8a632809bafebf0b463defec1)]
- Sudowrite's History cards display "chiclets" marking which context it took into account. [docs: [Sudowrite Write](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/write/pvxUvbQqYybfEosqx1sXjY)] Users have still asked for a way to view the full context used. [anecdote: [Sudowrite feedback board](https://feedback.sudowrite.com/p/a-way-to-view-the-context-used-to-generate-text-6)]

**3. In these tools, keeping the record is the player's work.** Writing lorebook keys and story card triggers, turning on summarisation, and checking what the model saw are all manual. NovelAI calls its placement settings "for experienced users". [docs: [NovelAI Lorebook](https://docs.novelai.net/en/text/lorebook/)] Community guides disagree about whether Author's Note helps or is "a trap". [anecdote: [Blip's Beginner Guide](https://rentry.co/NovelAI-Quick-Start); [Context guide](https://tapwavezodiac.github.io/novelaiUKB/Context.html)] One AI Dungeon user says characters that "only exist as story cards" get forgotten unless also named in the story summary. [anecdote, via search summary of an r/AIDungeon thread] This is the opposite of what solo journaling players asked for in P6 (record-keeping never breaks the flow).

**4. Even with tracking, coherence is the failure players and writers report most.**

- In the ChatRPG solo game master study, participants' main concern was the narrative's coherence: details shifted, and the system forgot that the player had just picked up an item. The version with a separate Archivist agent scored higher on perceived intelligence, flow and immersion. [study: [arXiv 2502.19519](https://arxiv.org/abs/2502.19519); 12 participants in the comparative evaluation]
- AI Dungeon users ask whether the AI "ignores 90% of the written context". [anecdote, via search summary of r/AIDungeon]
- Writer needs, need 9, already records Wordcraft writers finding the model lacked narrative consistency and Sudowrite users losing context when a chat fills.

**5. Marking which words are the player's and which are the AI's is now ordinary practice, and the one study of it found it supports ownership.**

- NovelAI colours text by source: the opening prompt, AI-generated text, the user's edits to AI text, and text the user typed each get a different colour. Every generation and edit is kept in a branching Edit History. [docs: [NovelAI Editor](https://docs.novelai.net/en/text/editor)]
- Sudowrite generates into a side History column, not the document; text inserted from a card "will appear in purple until it's been edited by you". [docs: [Sudowrite Write](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/write/pvxUvbQqYybfEosqx1sXjY)]
- HaLLMark highlights text the writer wrote and text the AI influenced, with a prompt history and timeline. In a study with 13 creative writers it helped them retain a sense of control and ownership. [study: [Hoque et al., CHI 2024](https://cs.au.dk/~elm/pdf/hallmark.pdf)] (Writer needs lead 5 found this paper; the two product practices now make it a finding about practice, though the evidence that it *works* is still that one small study.)
- A 2026 preprint lists "point-of-decision provenance" among five design patterns for preserving authorship. [study: [Zhang, Bu and Dhillon, arXiv 2601.10236](https://arxiv.org/abs/2601.10236)]

### Branching paths for suggestions

**6. Tools offer suggestions in four shapes: a single continuation with rerolls, several cards to choose from, a structure built top-down, and (rarely) questions back.**

- *Single continuation plus reroll.* AI Dungeon: *Continue* generates the next output without a player turn; *Retry* produces a different version, and repeated retries build a "Retry Stack" to choose from; *Erase* removes the last action, the player's or the AI's, and can be undone. [docs: [How do I play AI Dungeon?](https://help.aidungeon.io/faq/how-to-play)] NovelAI: *Retry* regenerates the last output, and the History button shows how many generations exist at that point and lets the player pick one; Undo and Redo walk a branching timeline. [docs: [NovelAI Editor](https://docs.novelai.net/en/text/editor)]
- *Several cards.* Sudowrite's Write (Auto, Guided, Tone Shift) generates several cards in a side column, which can be stacked; since February 2023 users can choose to get only one card. [docs: [Sudowrite Write](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/write/pvxUvbQqYybfEosqx1sXjY); [changelog, "Generate just one card"](https://feedback.sudowrite.com/changelog/generate-just-one-card-other-improvements)] Each Wordcraft control (continue, elaborate, rewrite and so on) makes several suggestions; the user picks one to insert. [study: [Yuan et al., Wordcraft, IUI 2022](https://dl.acm.org/doi/10.1145/3490099.3511105), as described in a later paper's snippet]
- *Top-down structure.* Dramatron starts from a log line and generates characters, plot points, locations and then dialogue. [study: [Mirowski et al., arXiv 2209.14958](https://arxiv.org/abs/2209.14958)] Sudowrite's Story Bible flows Braindump to Synopsis to Outline to Scenes to Draft. [docs: Sudowrite glossary, finding 1]
- *Questions back* appear only in practice reports and one study (lead 3).

**7. Rerolls and edits make the player a curator of AI output, and the tools treat this as a core control.** AI Dungeon and NovelAI both make retry, erase and undo first-class (finding 6). Mitchell argues AI Dungeon's player "can stop, edit, modify and retry each utterance", sculpting the AI's responses and deciding what enters its memory, and that both AI Dungeon and Project December need repeated engagement for the player "to learn how to entice a satisfying experience from the system". He contrasts AI Dungeon's uncritical framing with Project December, which primes reflection. [paper, conceptual: [Mitchell, ELO 2021 / Electronic Book Review 2022](https://electronicbookreview.com/essay/repetition-and-defamiliarization-in-ai-dungeon-and-project-december/)] An itch.io developer playing a solo game with AI "frequently overrode the AI's responses and mistakes" to keep control of the story. [anecdote: [itch.io devlog](https://itch.io/devlog/1111038/wxw-playtest-experiment-soloaigiant-robots.amp)]

**8. The more text the AI writes per step, the less the writer feels the work is theirs.**

- Next-paragraph suggestions improved quality and productivity over next-sentence suggestions, especially for less regular writers, but scaffolded conditions brought a moderate drop in ownership and satisfaction (131 participants, argumentative writing). [study: [Dhillon et al., CHI 2024](https://arxiv.org/abs/2402.11723)]
- With AI help, psychological ownership fell about 0.85 to 1.0 points on a 7-point scale against unassisted writing, while cognitive load fell and quality held; style personalisation partly restored ownership (176 participants). [study: [Zhang, Bu and Dhillon, arXiv 2601.10236](https://arxiv.org/abs/2601.10236); same lab as Dhillon et al., so these two count as one source]
- Users did not consider themselves owners or authors of AI-written text, but still put their own name on it publicly. Personalising the text to their style made no difference to this; more user influence over the text raised ownership (two studies, n = 30 and n = 96). [study: [Draxler et al., "The AI Ghostwriter Effect", TOCHI 2024](https://arxiv.org/abs/2303.03283)]
- Kreminski names the "dearth of the author": when a short prompt becomes long text, the author's intent is "stretched so thinly over their writing that they may feel barely present". [paper, conceptual: [Kreminski, In2Writing at CHI 2024, arXiv 2404.10289](https://arxiv.org/abs/2404.10289)]
- A later paper cites Lee et al. for a direct correlation between self-reported ownership and the share of user-written text. [as cited in the snippet of a later paper; underlying Lee et al. paper not identified]

**9. When the AI proposes where the story goes, writers feel it takes over; as raw material or a brainstorming partner it does not.**

- Wordcraft Writers Workshop (13 professional writers): writers who used "story seeds" found it "required relinquishing control of the narrative", because suggestions rarely matched their plans; some confined generated text to siloed sections. Nearly all noticed a "default" voice in the model's output. [study: [Ippolito et al., arXiv 2211.05030](https://wordcraft-writers-workshop.appspot.com/paper/wordcraft_writers_workshop_paper.pdf)]
- Dramatron's 15 industry professionals saw value in generating ideas, world building and exploring alternatives, but said they would not use it to write a full play, found output formulaic or boilerplate in places, and the authors note its top-down structure "does not correspond to every writer's writing process". One playwright staged four "heavily edited and rewritten" scripts. [study: [Mirowski et al., arXiv 2209.14958](https://arxiv.org/abs/2209.14958)]
- CALYPSO's game masters valued both polished text to read aloud and rougher ideas they could develop "while keeping their own creative control". [study: [Zhu et al., AIIDE 2023](https://ojs.aaai.org/index.php/AIIDE/article/view/27534)]
- Writer needs, need 4, already records Clark et al. (a machine draft diverges from where the author wanted to go) and Singh et al. ("integrative leaps").

**10. Writers' and game masters' values decide which help they accept, and interface framing shapes how much control they expect.**

- Hobbyist storywriters want AI in a limited assistant role because ownership gives them "integrity and enjoyment"; both hobbyists and professionals wanted to keep ideas and creativity in their own hands; they distrust AI for characters and dialogue. [study: [Biermann, Ma and Yoon, DIS 2022, via UBC news](https://www.cs.ubc.ca/news/2022/06/dis-conference-paper-ubc-shows-what-writers-want-or-dont-want-ai)]
- Writers weigh support sources by availability, individuality and trust, and hold values of intention, authenticity and creativity. [study: [Gero, Long and Chilton, CHI 2023](https://api.openalex.org/works/doi:10.1145%2F3544548.3580782), via co-author's summary page]
- Eighteen writers who already use AI made deliberate decisions about when to engage it based on values such as authenticity and craftsmanship; they felt ownership "through careful oversight of each decision"; some refused to use AI-generated text directly to protect ownership. [study: [Guo et al., "From Pen to Prompt", C&C 2025](https://arxiv.org/abs/2411.03137)]
- Three prototypes with identical functions but different interface metaphors (agentic, tool-like, magical) changed where 18 writers expected to hold control and how they understood authorship. [study: [Carrera, Thomas-Mitchell and Wigdor, arXiv 2509.15440](https://arxiv.org/abs/2509.15440)]

**11. LLM help makes outputs more alike across people.** Stories written with LLM ideas were more similar to each other (writer needs, need 6, citing [Doshi and Hauser 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532)). Co-writing with InstructGPT, but not base GPT-3, made different authors' essays more similar, mainly because the model's own text was less diverse. [study: [Padmakumar and He, ICLR 2024](https://arxiv.org/abs/2309.05196)] ChatGPT users produced less semantically distinct ideas than users of another creativity tool, and "felt less responsible" for them (36 participants). [study: [Anderson, Shah and Kreminski, C&C 2024](https://arxiv.org/abs/2402.01536)] This upgrades the Doshi and Hauser lead to a finding.

**12. An AI game master fails in two directions: too compliant, or railroading. In-world consequences beat flat refusals.**

- SENNA's authors frame existing LLM game masters as either "overly compliant, leading to disjointed stories" or rigidly railroading. Redirection through world logic (offering information, NPC influence, in-world consequences) kept coherence "without diminishing immersion or autonomy"; hard denials were poorly received. [study: ["Guiding, Not Railroading", ACM 2026](https://dl.acm.org/doi/10.1145/3742413.3789218); [Aalborg thesis](https://projekter.aau.dk/projekter/files/784680954/Narrative_Adherence_in_LLM_driven_Games.pdf)]
- In ChatRPG, players preferred the more agentic game master and described being "guided by a game master" rather than steering it; filters that restricted player actions interrupted flow and diminished agency. [study: [arXiv 2502.19519](https://arxiv.org/abs/2502.19519)]
- A forum game master found the model stayed "a people pleaser": hard puzzles were solved too easily and tension was lost, because the player wanted the chance to be wrong. [anecdote: [EN World, AI GMs thread](https://www.enworld.org/threads/ai-gms.717132/post-9838202)]
- Player needs lead 2 (AI too easy to steer "even accidentally", [feddit.it](https://feddit.it/post/495489)) now has three further sources and becomes a finding.

**13. AI that writes the player's own character's actions or words is a standing complaint.** An AI Dungeon scenario prompt shared by users tells the AI it must "not make any decisions or write actions for the player"; users report the AI "mind reading" thoughts meant to be internal, and turning a quoted line of dialogue into narrated action. Character.AI users report bots "writing for my character". [anecdote: r/AIDungeon threads via mirrors ([1](https://nyc1.lr.ggtyler.dev/r/AIDungeon/comments/1gviuzv/an_annoying_issue_ive_come_across), [2](https://reddit.birdcat.cafe/r/AIDungeon/comments/1jadp3f/decent_ai_instructions)); Character.AI report via [RoboRhythms](https://www.roborhythms.com/pipsqueak-2-kissing-bug-character-ai/)] Anecdote only; how common it is is unknown.

**14. Typing free text every turn is a burden; designers move to hybrids.** Hidden Door found in testing that plain text entry was "actually not a great experience" and added emoji input alongside words; it also leans on human-written narrative "tropes". [press: Hilary Mason via [GamesBeat](https://gamesbeat.com/hidden-door-reveals-its-ai-powered-narrative-game-building-platform/)] A study of player perceptions of LLM-driven NPC dialogue found free-form input slower than choosing from pre-defined answers and potentially overwhelming, and suggests hybrid approaches. [study: ["Beyond Pre-Defined Scripts", ACM 2026](https://dl.acm.org/doi/pdf/10.1145/3742413.3789221)] Sudowrite users can switch the other way, to one card instead of several (finding 6), so neither "always several" nor "always type" suits everyone.

**15. Distrust of AI tools for fiction is active and organised.** Sudowrite's 2023 Story Engine launch, pitched as letting authors finish a novel within days, drew an overwhelmingly negative response centred on consent and training data; one co-founder was reported to have fed an unpublished workshop story to the tool without consent. [press: [Genre Grapevine (Jason Sanford)](https://jasonsanford.substack.com/p/genre-grapevine-on-the-sudowrite); [Distractify](https://www.distractify.com/p/sudowrite-controversy)] Writer needs, need 13, already records the Authors Guild and NaNoWriMo evidence.

## Leads

Single-source observations. Not findings.

1. **Helpfulness need not trade off against ownership.** One snippet attributes to the Wordcraft IUI 2022 study the finding that finding the LLM helpful "does not trade off with writers' feelings of ownership". Not confirmed from the paper; sits against finding 8. [study: [Yuan et al., IUI 2022](https://dl.acm.org/doi/10.1145/3490099.3511105), via search summary]
2. **Comparing several variations side by side lowers workload for wording.** ABScribe stored AI rewrites side by side; with 12 writers it cut workload and writers preferred non-linear revision across many variations. This is about wording, not story direction. [study: [Reza et al., CHI 2024](https://arxiv.org/abs/2310.00117)] Ai.llude adds that some writers liked comparing alternatives and one found shorter, more numerous options easier to judge. [study: [Zhou and Sterman, C&C 2024](https://arxiv.org/abs/2405.17843)]
3. **The AI asking the writer questions ("reverse prompting") was one of the prompts that yielded sparks.** [study: [Guo et al., C&C 2025](https://arxiv.org/abs/2411.03137)] Close to the *Ironsworn* oracle shape (earlier survey) and to Gaiman's "What if" questions (writer needs lead 9).
4. **Deliberately imperfect AI text can push writers to rewrite and make higher-level decisions.** Ai.llude offered "intermediate" suggestions alongside fluent ones (27 writers). [study: [Zhou and Sterman, C&C 2024](https://arxiv.org/abs/2405.17843)]
5. **Novelists used "antagonistic" suggestions to sharpen their own descriptive language** (4 novelists). [study: [Calderwood et al., HAI-GEN 2020](https://ceur-ws.org/Vol-2848/HAI-GEN-Paper-3.pdf)] Bears on writer needs lead 2 (wording versus ideas): with Chakrabarty et al. ([C&C 2024](https://arxiv.org/abs/2309.12570)) finding LLMs most useful for translating and reviewing, and finding 9's sources valuing ideas and details, the wording-versus-ideas question is still open.
6. **Players who enjoy discovery create the most new story branches with an LLM**, and without human input the model repeats patterns. [study: [Peng et al., "Player-Driven Emergence", IEEE CoG 2024](https://arxiv.org/abs/2404.17027)]
7. **Micro-suggestions and on-demand initiation** (the AI offers only when asked, and offers small pieces) are proposed as authorship-preserving patterns. [study: [Zhang, Bu and Dhillon, arXiv 2601.10236](https://arxiv.org/abs/2601.10236)]
8. **In CoAuthor, writers accepted about 72 to 76% of GPT-3 suggestions shown** (63 writers, 1,445 sessions). Acceptance alone says little about ownership. [study: [Lee, Liang and Yang, CHI 2022](https://arxiv.org/abs/2201.06796)]
9. **Some solo communities ban AI talk** (player needs lead 3). Not confirmed in this pass; no Ironsworn Discord or subreddit rule page surfaced.
10. **Dramatron participants felt they did not own co-written scripts** (writer needs, need 5, cited "more than half of 15"). This pass could not reconfirm the figure.

## Gaps

1. **Nothing was read in full** (see top). Highest priority to open: the Wordcraft IUI 2022 ownership result (lead 1), the ChatRPG paper's agency results, SENNA's sample and measures, and Dramatron section 5 (interviews).
2. **No study compares one suggestion against three, or offered options against questions back, on authorship.** The closest work (ABScribe, Ai.llude) is about wording variants, not story direction.
3. **No study of solo journaling RPG players using AI** was found. AI game master studies use D&D-style or bespoke games; the players' needs in issue #18 are not tested against AI tools.
4. **Effects of a visible versus hidden story record were not studied.** The product docs show visible, editable records are the norm; no source measured whether seeing the record helps or distracts.
5. **Resuming with an AI-written summary** (AI Dungeon's Story Summary, Memory Bank) is documented but not studied for whether players trust or use it.
6. **AI Dungeon player research is thin.** Only Mitchell's essay and a researcher-played preprint surfaced; no interview study of AI Dungeon players.
7. **Every source is about adults.** Narinav is for children.
8. **Product docs describe current versions;** features and names change often (AI Dungeon renamed Memory and World Info). Dates on docs were not checked.

## Stopping point

Stopped when the last three searches (the LIGS system, Dramamancer's narrator suggestions, and Dramatron's ownership figure) returned nothing that changed or added a finding. The session cap was not reached.

## How this bears on Narinav (observations, not decisions)

For later tickets. Terms follow `GLOSSARY.md`: Suggestion, Story bible, Artifact, Anchor.

- **Story bible.** AI Dungeon, NovelAI and Sudowrite all keep a layered record (findings 1 and 2) that the player can see and edit, but the player maintains it (finding 3). Narinav's Story bible is kept by Claude, which serves P6 (record-keeping never breaks flow) but gives up the visibility those tools offer. Context viewers and Sudowrite's "chiclets" are a middle shape: the record is kept for the player and can be inspected. Coherence still fails in AI games with tracking (finding 4), so a Story bible alone does not settle "facts kept straight".
- **Curating moves into the record's style.** Narinav rewrites every move, chosen or written, into the record's style. Findings 5 and 8 say ownership falls as the AI's share of the words rises, and Draxler's ghostwriter effect says people may put their name on text they do not feel is theirs. The option to keep the original wording, and provenance marking of the kind NovelAI and Sudowrite use, both bear on the shared need "trust the tool won't pass its words off as mine" and on the secondary need "own wording kept if wanted".
- **Suggestions as direction, not prose.** Three Suggestions of a next move are closer to a brainstorming partner than to a continuation. But finding 9 says AI proposing where the story goes is exactly where writers felt they lost control (Wordcraft story seeds). The player writing their own move instead keeps P8 (the player decides) open. The prototype's second step, three Claude-written renderings of each beat (current game write-up, "Turn loop"), is the paragraph-scale help that finding 8 links to lower ownership.
- **Three, one or a question.** No study settles the number (gap 2). Sudowrite's one-card option and Hidden Door's input changes (finding 14) suggest players differ. Questions back (lead 3) and the *Ironsworn* oracle are a shape Narinav's turn loop does not currently use.
- **Rerolls.** AI Dungeon and NovelAI make rerolls unlimited and keep every branch (findings 6 and 7). The prototype allows two refreshes a turn. Unlimited rerolls turn the player into a curator; a budget is what the earlier survey found keeps stories moving.
- **Fresh, not generic.** Finding 11 says every player drawing Suggestions from the same model risks similar stories across players. Player-picked Anchors are a player-side constraint and may pull against that; nothing here tests it.
- **Pushback.** Finding 12 says a partner that always yields feels hollow and one that blocks feels like railroading; in-world consequences worked better than refusals. This bears on how Claude treats a written move that the story bible contradicts, and on "losing still counts" (P10).
- **Never speak for the player's character.** Finding 13 is a known failure in AI Dungeon practice and bears directly on Claude curating the player's move.
- **The Artifact.** Ownership findings (5, 8, 10) and the distrust in finding 15 bear on whether a player, especially a writer, can take the Artifact away as theirs, and on how Narinav says who wrote what.
