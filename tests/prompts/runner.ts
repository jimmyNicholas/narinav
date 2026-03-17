import { config } from "dotenv";
config({ path: ".env.local" });
import { beatBotOpenTests } from "./tests/beatBot.open";
import { beatBotContinueTests } from "./tests/beatBot.continue";
import { refinementOpenTests } from "./tests/refinement.open";
import { refinementContinueTests } from "./tests/refinement.continue";
import { classifierTests } from "./tests/classifier";
import { storyBibleTests } from "./tests/storyBible";
import * as fs from "fs";
import * as path from "path";
import { createMessage, extractJson } from "../../app/api/story/anthropic";

// ── Cost model ────────────────────────────────────────────────────────────────
// Approximate costs per call in USD (update if model pricing changes).
// Source: https://www.anthropic.com/pricing
// These are rough estimates based on average token usage per action type.

const COST_PER_CALL: Record<string, number> = {
  beatBot: 0.0004, // ~500 input + ~100 output tokens, Haiku
  refinementBot: 0.0008, // ~800 input + ~200 output tokens, Haiku
  classify: 0.0001, // ~200 input + ~50 output tokens, Haiku
  storyBibleUpdate: 0.0006, // ~600 input + ~150 output tokens, Haiku
};

// Multiplier if not using dev mode (Sonnet is ~10x Haiku)
const PRODUCTION_MULTIPLIER = 10;

export type AssertionType = "auto" | "manual";

export type Assertion = {
  type: AssertionType;
  description: string;
  // Return:
  // - boolean: PASS/FAIL (mapped to 100/0 score)
  // - number: score from 0–100 (higher is better)
  check?: (result: unknown) => boolean | number;
  reviewPrompt?: string;
};

export type TestCase = {
  id: string;
  tag: string;
  action: string;
  notes: string;
  payload: Record<string, unknown>;
  assertions: Assertion[];
};

export type TestResult = {
  id: string;
  notes: string;
  passed: boolean | "manual";
  score?: number; // 0–100 for auto assertions (undefined if no auto assertions)
  assertions: {
    description: string;
    type: AssertionType;
    passed: boolean | "manual";
    score?: number; // 0–100 for auto assertions
    reviewPrompt?: string;
  }[];
  response: unknown;
  error?: string;
};

export type JudgeResult = {
  id: string;
  assertion: string;
  verdict: "PASS" | "FAIL";
  reason: string;
  suggested_change: string | null;
};

const API_URL = process.env.TEST_API_URL ?? "http://localhost:3000/api/story";
const DEV_MODE = true;

// Uses a better model for quality judgement — separate from DEV_MODE_MODEL
const JUDGE_MODEL = "claude-opus-4-6";

// ── Judge prompt ──────────────────────────────────────────────────────────────

const JUDGE_SYSTEM = `You are a prompt quality judge for Navinav, a collaborative storytelling game.

You receive:
  - A test case: what it checks and why it matters
  - The AI output being evaluated
  - A review prompt: the specific question to answer

Your job:
  1. Give a verdict: PASS or FAIL
  2. One sentence explaining why
  3. If FAIL: one specific, actionable prompt change that would fix it.
     Reference the exact constant or block to change (e.g. REFINEMENT_OPEN, REFINEMENT_RULES,
     BEAT_BOT_OPEN). Do not give general advice — give a concrete edit.

Return JSON only. No commentary.
{
  "verdict": "PASS" | "FAIL",
  "reason": "...",
  "suggested_change": "..." | null
}`;

const allTests: TestCase[] = [
  ...beatBotOpenTests,
  ...beatBotContinueTests,
  ...refinementOpenTests,
  ...refinementContinueTests,
  ...classifierTests,
  ...storyBibleTests,
];

// ── Argument parsing ──────────────────────────────────────────────────────────

type RunnerArgs = {
  filter: string | null;
  suite: string | null;
  yes: boolean;
  list: boolean;
  judge: boolean;
  bail: boolean;
  minScore: number;
};

function parseArgs(): RunnerArgs {
  const args = process.argv.slice(2);
  const filterIndex = args.findIndex((a) => a === "--filter" || a === "-f");
  const filter = filterIndex !== -1 ? (args[filterIndex + 1] ?? null) : null;
  const suiteIndex = args.findIndex((a) => a === "--suite" || a === "-s");
  const suite = suiteIndex !== -1 ? (args[suiteIndex + 1] ?? null) : null;
  const yes = args.includes("--yes") || args.includes("-y");
  const list = args.includes("--list") || args.includes("-l");
  const judge = args.includes("--judge") || args.includes("-j");
  const bail = args.includes("--bail") || args.includes("-b");
  const minScoreIndex = args.findIndex(
    (a) => a === "--minScore" || a === "--min-score"
  );
  const minScoreRaw =
    minScoreIndex !== -1 ? (args[minScoreIndex + 1] ?? null) : null;
  const parsedMinScore =
    minScoreRaw === null ? 100 : Number.parseFloat(minScoreRaw);
  const minScore = Number.isFinite(parsedMinScore) ? parsedMinScore : 100;

  return { filter, suite, yes, list, judge, bail, minScore };
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

type SuiteKey =
  | "classifier"
  | "beatBotOpen"
  | "beatBotContinue"
  | "refinementOpen"
  | "refinementContinue"
  | "storyBible";

const SUITES: Record<SuiteKey, (t: TestCase) => boolean> = {
  classifier: (t) => t.tag === "classifier",
  beatBotOpen: (t) => t.tag === "beatBot" && t.action === "beatBot" && t.id <= "T05",
  beatBotContinue: (t) => t.tag === "beatBot" && t.action === "beatBot" && t.id >= "T06" && t.id <= "T08",
  refinementOpen: (t) => t.tag === "storyBot" && t.action === "refinementBot" && t.id >= "T09" && t.id <= "T11",
  refinementContinue: (t) => t.tag === "storyBot" && t.action === "refinementBot" && t.id >= "T12" && t.id <= "T15",
  storyBible: (t) => t.tag === "storyBible",
};

function validSuiteKeys(): string {
  return Object.keys(SUITES).join(", ");
}

function applySuite(tests: TestCase[], suite: string): TestCase[] {
  const key = suite as SuiteKey;
  const pred = SUITES[key];
  if (!pred) return [];
  return tests.filter(pred);
}

// ── Cost estimate ─────────────────────────────────────────────────────────────

function estimateCost(
  tests: TestCase[],
  devMode: boolean
): {
  callCount: number;
  estimatedUSD: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let totalCost = 0;

  for (const test of tests) {
    const costPerCall = COST_PER_CALL[test.action] ?? 0.0005;
    const multiplier = devMode ? 1 : PRODUCTION_MULTIPLIER;
    totalCost += costPerCall * multiplier;
    breakdown[test.tag] = (breakdown[test.tag] ?? 0) + 1;
  }

  return {
    callCount: tests.length,
    estimatedUSD: totalCost,
    breakdown,
  };
}

// ── Confirmation prompt ───────────────────────────────────────────────────────

async function confirmRun(
  tests: TestCase[],
  filter: string | null,
  devMode: boolean,
  skipConfirm: boolean,
  judgeEnabled: boolean
): Promise<boolean> {
  const { callCount, estimatedUSD, breakdown } = estimateCost(tests, devMode);

  const modelLabel = devMode ? "Haiku (dev mode)" : "Sonnet (production)";
  const filterLabel = filter ? `tag="${filter}"` : "all tests";

  // Calculate judge cost if enabled
  const manualCount = tests.reduce(
    (n, t) => n + t.assertions.filter((a) => a.type === "manual").length,
    0
  );
  const judgeCost = manualCount * 0.006; // Opus ~15x Haiku per call

  console.log("\n═══════════════════════════════════════════");
  console.log(" NAVINAV TEST RUNNER");
  console.log("═══════════════════════════════════════════");
  console.log(`  Filter:    ${filterLabel}`);
  console.log(`  Model:     ${modelLabel}`);
  console.log(`  Tests:     ${callCount} API calls`);
  console.log(`  Est. cost: ~$${estimatedUSD.toFixed(4)} USD`);
  if (judgeEnabled) {
    console.log(
      `  Judge:     ${manualCount} manual assertions (~$${judgeCost.toFixed(
        4
      )} extra, Opus)`
    );
    console.log(
      `  Total est: ~$${(estimatedUSD + judgeCost).toFixed(4)} USD`
    );
  }
  console.log("  Breakdown:");
  for (const [tag, count] of Object.entries(breakdown)) {
    console.log(`    ${tag.padEnd(16)} ${count} test${count === 1 ? "" : "s"}`);
  }
  console.log("───────────────────────────────────────────");

  if (skipConfirm) {
    console.log("  Skipping confirmation (--yes flag)\n");
    return true;
  }

  const { createInterface } = await import("readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question("  Run these tests? [y/N] ", (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ── Judge function ────────────────────────────────────────────────────────────

async function judgeManualAssertion(params: {
  testId: string;
  testNotes: string;
  assertionDescription: string;
  reviewPrompt: string;
  response: unknown;
}): Promise<{
  verdict: "PASS" | "FAIL";
  reason: string;
  suggested_change: string | null;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const userMessage = `Test ID: ${params.testId}
Test notes: ${params.testNotes}
Assertion: ${params.assertionDescription}
Review question: ${params.reviewPrompt}

AI output to evaluate:
${JSON.stringify(params.response, null, 2)}`;

  const text = await createMessage({
    apiKey,
    model: JUDGE_MODEL,
    system: JUDGE_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 512,
  });

  try {
    const json = extractJson(text);
    const parsed = JSON.parse(json) as {
      verdict: "PASS" | "FAIL";
      reason: string;
      suggested_change: string | null;
    };
    return parsed;
  } catch {
    return {
      verdict: "FAIL",
      reason: "Could not parse judge response",
      suggested_change: null,
    };
  }
}

// ── Judge pass ────────────────────────────────────────────────────────────────

async function runJudgePass(results: TestResult[]): Promise<JudgeResult[]> {
  const judgeResults: JudgeResult[] = [];

  console.log("\n───────────────────────────────────────────");
  console.log(" JUDGE PASS");
  console.log("───────────────────────────────────────────\n");

  for (const result of results) {
    const manualAssertions = result.assertions.filter(
      (a) => a.type === "manual"
    );
    if (manualAssertions.length === 0) continue;

    for (const assertion of manualAssertions) {
      process.stdout.write(
        `  Judging ${result.id} — ${assertion.description.slice(0, 50)}...`
      );

      let judgement: {
        verdict: "PASS" | "FAIL";
        reason: string;
        suggested_change: string | null;
      };

      try {
        judgement = await judgeManualAssertion({
          testId: result.id,
          testNotes: result.notes,
          assertionDescription: assertion.description,
          reviewPrompt: assertion.reviewPrompt ?? "",
          response: result.response,
        });
      } catch (e) {
        judgement = {
          verdict: "FAIL",
          reason: e instanceof Error ? e.message : "Judge call failed",
          suggested_change: null,
        };
      }

      const icon = judgement.verdict === "PASS" ? "✓" : "✗";
      process.stdout.write(` ${icon}\n`);

      if (judgement.verdict === "FAIL") {
        console.log(`       Reason: ${judgement.reason}`);
        if (judgement.suggested_change) {
          console.log(`       Fix:    ${judgement.suggested_change}`);
        }
      }

      judgeResults.push({
        id: result.id,
        assertion: assertion.description,
        verdict: judgement.verdict,
        reason: judgement.reason,
        suggested_change: judgement.suggested_change,
      });

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Print consolidated suggested changes
  const fixes = judgeResults.filter(
    (j) => j.verdict === "FAIL" && j.suggested_change
  );

  if (fixes.length > 0) {
    console.log("\n───────────────────────────────────────────");
    console.log(" SUGGESTED PROMPT CHANGES");
    console.log("───────────────────────────────────────────");
    for (const fix of fixes) {
      console.log(`\n  ${fix.id}: ${fix.assertion}`);
      console.log(`  → ${fix.suggested_change}`);
    }
    console.log();
  } else {
    console.log("\n  All manual assertions passed judge review.\n");
  }

  return judgeResults;
}

// ── List tests ────────────────────────────────────────────────────────────────

function listTests(tests: TestCase[], all: TestCase[]) {
  const tags = [...new Set(all.map((t) => t.tag))];
  const modes = [
    ...new Set(
      all
        .map((t) => t.payload.mode)
        .filter((m): m is string => typeof m === "string")
    ),
  ];

  console.log("\n  Available tags:");
  for (const tag of tags) {
    const count = all.filter((t) => t.tag === tag).length;
    const ids = all
      .filter((t) => t.tag === tag)
      .map((t) => t.id)
      .join(", ");
    console.log(`    --filter ${tag.padEnd(14)} ${count} tests  (${ids})`);
  }

  if (modes.length > 0) {
    console.log("\n  Available modes:");
    for (const mode of modes) {
      const count = all.filter((t) => t.payload.mode === mode).length;
      console.log(`    --mode   ${mode.padEnd(14)} ${count} tests`);
    }
  }

  console.log("\n  Available suites:");
  for (const key of Object.keys(SUITES) as SuiteKey[]) {
    const count = all.filter(SUITES[key]).length;
    console.log(`    --suite  ${key.padEnd(18)} ${count} tests`);
  }

  if (tests.length < all.length) {
    console.log(`\n  Filtered to ${tests.length} of ${all.length} tests:`);
    for (const t of tests) {
      console.log(`    ${t.id}  ${t.notes}`);
    }
  } else {
    console.log(`\n  All ${all.length} tests:`);
    for (const t of all) {
      console.log(`    ${t.id}  [${t.tag}]  ${t.notes}`);
    }
  }
  console.log();
}

async function runTest(test: TestCase): Promise<TestResult> {
  let response: unknown = null;
  let error: string | undefined;

  try {
    const payload = { ...test.payload, options: { devMode: DEV_MODE } };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    response = await res.json();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const assertionResults = test.assertions.map((a) => {
    if (a.type === "manual") {
      return {
        description: a.description,
        type: a.type,
        passed: "manual" as const,
        reviewPrompt: a.reviewPrompt,
      };
    }
    let passed = false;
    let score = 0;
    try {
      if (error) {
        passed = false;
        score = 0;
      } else {
        const result = a.check!(response);
        if (typeof result === "number") {
          score = clampScore(result);
          passed = score >= 100;
        } else {
          passed = result;
          score = passed ? 100 : 0;
        }
      }
    } catch {
      passed = false;
      score = 0;
    }
    return { description: a.description, type: a.type, passed, score };
  });

  const autoAssertions = assertionResults.filter((a) => a.type === "auto");
  const hasAuto = autoAssertions.length > 0;
  const autoScore = hasAuto
    ? clampScore(
        autoAssertions.reduce((sum, a) => sum + (a.score ?? 0), 0) /
          autoAssertions.length
      )
    : undefined;

  const hasManual = assertionResults.some((a) => a.type === "manual");
  const passed = error ? false : hasAuto ? (hasManual ? "manual" : true) : true;

  return {
    id: test.id,
    notes: test.notes,
    passed,
    score: autoScore,
    assertions: assertionResults,
    response,
    error,
  };
}

function printReport(results: TestResult[], minScore: number) {
  const auto = results.filter((r) => r.assertions.some((a) => a.type === "auto"));
  const autoPassed = auto.filter(
    (r) => r.error === undefined && (r.score ?? 100) >= minScore
  ).length;
  const autoFailed = auto.filter(
    (r) => r.error !== undefined || (r.score ?? 100) < minScore
  ).length;
  const manualReview = results.filter((r) => r.passed === "manual").length;

  console.log("\n═══════════════════════════════════════════");
  console.log(" NAVINAV PROMPT TEST MATRIX");
  console.log("═══════════════════════════════════════════");
  console.log(`  Auto passed:     ${autoPassed}  (minScore=${minScore})`);
  console.log(`  Auto failed:     ${autoFailed}`);
  console.log(`  Manual review:   ${manualReview}`);
  console.log("───────────────────────────────────────────\n");

  for (const r of results) {
    const hardFail = r.error !== undefined;
    const autoFail = r.score !== undefined && r.score < minScore;
    const icon = hardFail || autoFail ? "✗" : r.passed === "manual" ? "?" : "✓";
    console.log(`  ${icon} ${r.id}  ${r.notes}`);
    if (r.score !== undefined) {
      console.log(`       Score: ${r.score.toFixed(0)}/100`);
    }
    if (r.error) console.log(`       ERROR: ${r.error}`);
    for (const a of r.assertions) {
      const resp: any = r.response as any;
      const interesting =
        resp?.renderings ?? resp?.next_beats ?? resp?.story_bible_update ?? resp;

      if (a.type === "auto" && (a.score ?? 0) < 100) {
        console.log(
          `       FAILED: ${a.description}` +
            (a.score !== undefined ? ` (score=${a.score.toFixed(0)})` : "")
        );
        console.log(
          `              Response: ${JSON.stringify(interesting, null, 2)}`
        );
      }
      if (a.passed === "manual") {
        console.log(`       REVIEW: ${a.description}`);
        console.log(`              → ${a.reviewPrompt}`);
        console.log(
          `              Response: ${JSON.stringify(interesting, null, 2)}`
        );
      }
    }
  }

  console.log("\n═══════════════════════════════════════════\n");
}

async function main() {
  const args = parseArgs();

  // Start from all tests, then apply suite/tag filtering.
  let filteredTests = allTests;

  if (args.suite) {
    filteredTests = applySuite(filteredTests, args.suite);
    if (filteredTests.length === 0) {
      console.error(`\n  Error: no tests found for suite "${args.suite}".`);
      console.error(`  Valid suites: ${validSuiteKeys()}\n`);
      process.exit(1);
    }
  }

  // Filter tests by tag if --filter provided (can be combined with --suite)
  if (args.filter) {
    filteredTests = filteredTests.filter((t) => t.tag === args.filter);
  }

  // Validate filter
  if (args.filter && filteredTests.length === 0) {
    const validTags = [...new Set(allTests.map((t) => t.tag))].join(", ");
    console.error(`\n  Error: no tests found for tag "${args.filter}".`);
    console.error(`  Valid tags: ${validTags}\n`);
    console.error(`  Valid suites: ${validSuiteKeys()}\n`);
    process.exit(1);
  }

  // --list: show available tests and exit
  if (args.list) {
    listTests(filteredTests, allTests);
    process.exit(0);
  }

  // Show cost estimate and confirm
  const confirmed = await confirmRun(
    filteredTests,
    args.filter,
    DEV_MODE,
    args.yes,
    args.judge
  );
  if (!confirmed) {
    console.log("\n  Aborted.\n");
    process.exit(0);
  }

  console.log(`\nRunning ${filteredTests.length} tests against ${API_URL}...\n`);

  // Run tests
  const results: TestResult[] = [];
  for (const test of filteredTests) {
    process.stdout.write(`  Running ${test.id} [${test.tag}]...`);
    const result = await runTest(test);
    results.push(result);
    process.stdout.write(
      result.passed === true
        ? " ✓\n"
        : result.passed === "manual"
          ? " ?\n"
          : " ✗\n"
    );

    // Bail on first hard failure if --bail flag set
    const hardFail = result.error !== undefined;
    const autoFail = result.score !== undefined && result.score < args.minScore;
    if (args.bail && (hardFail || autoFail)) {
      console.log(`\n  Bailed on ${result.id} — first hard failure.\n`);
      printReport(results, args.minScore);
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  printReport(results, args.minScore);

  // Write test results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = args.filter ? `-${args.filter}` : "";
  const outPath = path.join(
    __dirname,
    "results",
    `run${suffix}-${timestamp}.json`
  );
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`  Results written to ${outPath}\n`);

  // Optional judge pass
  if (args.judge) {
    const judgeResults = await runJudgePass(results);

    const judgePath = path.join(
      __dirname,
      "results",
      `judge${suffix}-${timestamp}.json`
    );
    fs.writeFileSync(judgePath, JSON.stringify(judgeResults, null, 2));
    console.log(`  Judge results written to ${judgePath}\n`);

    // Exit with failure code if any judge verdicts failed
    const anyJudgeFailed = judgeResults.some((j) => j.verdict === "FAIL");
    if (anyJudgeFailed) process.exit(1);
  }

  // Exit with failure code if any auto assertions failed
  const anyFailed = results.some(
    (r) => r.error !== undefined || (r.score !== undefined && r.score < args.minScore)
  );
  if (anyFailed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

