import { spawn } from "node:child_process";

const resetColor = "\u001B[0m";
const boldText = "\u001B[1m";
const dimText = "\u001B[2m";
const greenText = "\u001B[32m";
const redText = "\u001B[31m";

const tasks = [
  "format",
  "lint:fix",
  "typecheck",
  "typecheck:convex",
  "test",
  "test:convex",
  "test:browser",
];

const runTask = (script: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", script], {
      shell: true,
      stdio: "inherit",
    });
    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
};

const run = async () => {
  console.log(`\n${boldText}====== CI CHECKS ======${resetColor}\n`);
  const startTime = Date.now();
  const failed: string[] = [];

  for (const task of tasks) {
    console.log(`\n${boldText}> bun run ${task}${resetColor}`);
    const ok = await runTask(task);
    if (!ok) {
      failed.push(task);
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${dimText}Total: ${duration}s${resetColor}`);

  if (failed.length === 0) {
    console.log(`${boldText}${greenText}All checks passed.${resetColor}`);
  } else {
    console.log(`${boldText}${redText}Failed: ${failed.join(", ")}${resetColor}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  console.log(`\n${redText}Interrupted${resetColor}`);
  process.exit(1);
});

void run();
