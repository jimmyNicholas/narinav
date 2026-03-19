import { createInterface } from "readline";
import { spawnSync } from "child_process";

type MenuItem = {
  label: string;
  script: string | null;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Classifier (quick)", script: "test:prompts:classifier" },
  { label: "BeatBot open (quick)", script: "test:prompts:beatBotOpen" },
  { label: "BeatBot continue (quick)", script: "test:prompts:beatBotContinue" },
  { label: "Refinement open (quick)", script: "test:prompts:refinementOpen" },
  { label: "Refinement continue (quick)", script: "test:prompts:refinementContinue" },
  { label: "Story Bible (quick)", script: "test:prompts:storyBible" },
  { label: "Classifier (with judge)", script: "test:prompts:classifier:judge" },
  { label: "BeatBot open (with judge)", script: "test:prompts:beatBotOpen:judge" },
  { label: "Refinement open (with judge)", script: "test:prompts:refinementOpen:judge" },
  { label: "Story workflow (with judge)", script: "test:prompts:storyBot:judge" },
  { label: "Full suite (judge + bail)", script: "test:prompts:full" },
  { label: "List all tags", script: "test:prompts:list" },
  { label: "All prompts (quick, no judge)", script: "test:prompts:yes" },
  { label: "Exit", script: null },
];

function runScript(script: string) {
  console.log(`\n▶ Running: npm run ${script}\n`);
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`\nError running script "${script}":`, result.error.message);
  }
}

async function promptLoop() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query: string) =>
    new Promise<string>((resolve) => rl.question(query, resolve));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log("\n═══════════════════════════════════════════");
    console.log(" NAVINAV PROMPT TEST MENU");
    console.log("═══════════════════════════════════════════");
    MENU_ITEMS.forEach((item, index) => {
      const num = (index + 1).toString().padStart(2, " ");
      console.log(`  ${num}. ${item.label}`);
    });
    console.log("───────────────────────────────────────────");

    const answer = (await ask("Select an option (number): ")).trim();
    const choice = Number.parseInt(answer, 10);

    if (!Number.isFinite(choice) || choice < 1 || choice > MENU_ITEMS.length) {
      console.log("  Invalid choice. Please enter a valid number.");
      continue;
    }

    const item = MENU_ITEMS[choice - 1];
    if (!item.script) {
      console.log("\n  Goodbye.\n");
      break;
    }

    runScript(item.script);
  }

  rl.close();
}

promptLoop().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

