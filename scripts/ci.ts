/* eslint-disable no-console */
import { spawn } from "node:child_process";

const resetColor = "\x1b[0m";
const boldText = "\x1b[1m";
const greenText = "\x1b[32m";
const redText = "\x1b[31m";

const printHeader = () => {
  console.log(`\n${boldText}====== CI CHECKS (Turbo) ======${resetColor}\n`);
};

const runTurbo = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const childProcess = spawn(
      "bunx",
      [
        "turbo",
        "run",
        "format",
        "lint:fix",
        "typecheck",
        "typecheck:convex",
        "test",
        "test:convex",
        "test:browser",
      ],
      {
        shell: true,
        stdio: "inherit",
      },
    );

    childProcess.on("close", (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n${boldText}Total run time: ${duration}s${resetColor}\n`);
      resolve(code === 0);
    });
  });
};

const run = async () => {
  printHeader();
  const success = await runTurbo();

  if (success) {
    console.log(
      `${boldText}${greenText}✓ All checks passed successfully!${resetColor}`,
    );
  } else {
    console.log(
      `${boldText}${redText}✗ Some checks failed. Please fix the issues above.${resetColor}`,
    );
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  console.log(`\n${redText}Process interrupted by user${resetColor}`);
  process.exit(1);
});

void run();
