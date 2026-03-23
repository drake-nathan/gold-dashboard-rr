import { spawn } from "node:child_process";

import { Listr } from "listr2";

const tasks = [
  { script: "format", title: "Format" },
  { script: "lint:fix", title: "Lint" },
  { script: "typecheck", title: "Typecheck" },
  { script: "typecheck:convex", title: "Typecheck (Convex)" },
  { script: "test", title: "Test" },
  { script: "test:convex", title: "Test (Convex)" },
  { script: "test:browser", title: "Test (Browser)" },
];

const runScript = (script: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const child = spawn("bun", ["run", script], {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });
    child.stdout.on("data", (d: Buffer) => {
      chunks.push(d);
    });
    child.stderr.on("data", (d: Buffer) => {
      chunks.push(d);
    });
    child.on("close", (code) => {
      const output = Buffer.concat(chunks).toString();
      if (code === 0) resolve(output);
      else reject(new Error(output));
    });
  });
};

const runner = new Listr(
  tasks.map(({ script, title }) => ({
    options: { persistentOutput: true },
    task: async (_ctx: unknown, task: { output: string }) => {
      try {
        await runScript(script);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        task.output = msg;
        throw new Error(`${title} failed`, { cause: error });
      }
    },
    title: `${title}  —  bun run ${script}`,
  })),
  {
    concurrent: false,
    exitOnError: true,
    rendererOptions: {
      collapseErrors: false,
      collapseSubtasks: false,
    },
  },
);

const startTime = Date.now();

try {
  await runner.run();
} catch {
  // listr2 already rendered the error
} finally {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n  Total: ${duration}s`);
}

if (runner.errors.length > 0) {
  process.exit(1);
}
