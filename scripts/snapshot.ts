/* eslint-disable no-console */
/**
 * Convex Snapshot Management
 *
 * Export prod data and import to dev environment.
 * Uses targeted Convex queries for efficient export (only needed tables).
 *
 * Usage:
 *   bun run snapshot:export   # Export from prod
 *   bun run snapshot:import   # Import to dev
 *   bun run snapshot:sync     # Export then import
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// ============================================================================
// Configuration
// ============================================================================

const SEED_DIR = "convex/seed";
const MAX_SNAPSHOTS = 3;

// Tables to export/import with their Convex query functions
const TABLES = [
  { exportFn: "snapshotExport:exportCostcoProducts", name: "costcoProducts" },
  { exportFn: "snapshotExport:exportPureProducts", name: "pureProducts" },
  {
    exportFn: "snapshotExport:exportCollectPurePrices",
    name: "collectPurePrices",
  },
  { exportFn: "snapshotExport:exportMarketPrices", name: "marketPrices" },
];

// ============================================================================
// Terminal UI Helpers
// ============================================================================

const colors = {
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

const symbols = {
  arrow: "→",
  bullet: "•",
  error: "✗",
  info: "ℹ",
  success: "✓",
  warning: "⚠",
};

type StepStatus = "error" | "pending" | "running" | "skipped" | "success";

interface Step {
  duration?: number;
  message?: string;
  name: string;
  status: StepStatus;
}

let steps: Step[] = [];
let currentHeader = "";

const clearScreen = () => {
  console.clear();
};

const printHeader = (title: string) => {
  currentHeader = title;
  const line = "═".repeat(title.length + 4);
  console.log(`\n${colors.bold}${colors.cyan}╔${line}╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  ${title}  ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚${line}╝${colors.reset}\n`);
};

const printSteps = () => {
  clearScreen();
  printHeader(currentHeader);

  const maxNameLen = Math.max(...steps.map((s) => s.name.length), 20);

  for (const step of steps) {
    let icon: string;
    let color: string;
    let statusText: string;

    switch (step.status) {
      case "error": {
        icon = symbols.error;
        color = colors.red;
        statusText = "failed";
        break;
      }
      case "pending": {
        icon = symbols.bullet;
        color = colors.gray;
        statusText = "pending";
        break;
      }
      case "running": {
        icon = symbols.arrow;
        color = colors.yellow;
        statusText = "running...";
        break;
      }
      case "skipped": {
        icon = symbols.warning;
        color = colors.yellow;
        statusText = "skipped";
        break;
      }
      case "success": {
        icon = symbols.success;
        color = colors.green;
        statusText =
          step.duration ? `done (${step.duration.toFixed(1)}s)` : "done";
        break;
      }
    }

    const name = step.name.padEnd(maxNameLen);
    const msg =
      step.message ? ` ${colors.dim}${step.message}${colors.reset}` : "";

    console.log(
      `  ${color}${icon}${colors.reset} ${name} ${color}${statusText}${colors.reset}${msg}`,
    );
  }

  console.log("");
};

const updateStep = (
  index: number,
  status: StepStatus,
  message?: string,
  duration?: number,
) => {
  steps[index].status = status;
  if (message !== undefined) steps[index].message = message;
  if (duration !== undefined) steps[index].duration = duration;
  printSteps();
};

// ============================================================================
// Command Execution
// ============================================================================

const runCommand = (
  command: string,
  args: string[],
  options?: { silent?: boolean },
): Promise<{ output: string; success: boolean }> => {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
      if (!options?.silent) {
        process.stdout.write(colors.dim + data.toString() + colors.reset);
      }
    });

    proc.stderr.on("data", (data: Buffer) => {
      output += data.toString();
      if (!options?.silent) {
        process.stdout.write(colors.dim + data.toString() + colors.reset);
      }
    });

    proc.on("close", (code) => {
      resolve({ output, success: code === 0 });
    });
  });
};

// ============================================================================
// Snapshot Management
// ============================================================================

const getSnapshots = (): string[] => {
  if (!existsSync(SEED_DIR)) return [];

  return readdirSync(SEED_DIR)
    .filter((f) => f.startsWith("prod-snapshot-") && f.endsWith(".json"))
    .map((f) => join(SEED_DIR, f))
    .sort()
    .reverse(); // Newest first
};

const cleanOldSnapshots = (): number => {
  const snapshots = getSnapshots();
  let deleted = 0;

  if (snapshots.length > MAX_SNAPSHOTS) {
    const toDelete = snapshots.slice(MAX_SNAPSHOTS);
    for (const file of toDelete) {
      rmSync(file);
      deleted++;
    }
  }

  // Also clean up any old .zip files from previous approach
  if (existsSync(SEED_DIR)) {
    const oldZips = readdirSync(SEED_DIR).filter((f) => f.endsWith(".zip"));
    for (const zip of oldZips) {
      rmSync(join(SEED_DIR, zip));
      deleted++;
    }
  }

  return deleted;
};

const getLatestSnapshot = (): null | string => {
  const snapshots = getSnapshots();
  return snapshots[0] || null;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============================================================================
// Export Command
// ============================================================================

const exportSnapshot = async (): Promise<boolean> => {
  const startTime = Date.now();
  const date = new Date().toISOString().split("T")[0];
  const snapshotFile = join(SEED_DIR, `prod-snapshot-${date}.json`);

  steps = [
    { name: "Create seed directory", status: "pending" },
    ...TABLES.map((t) => ({
      name: `Export ${t.name}`,
      status: "pending" as StepStatus,
    })),
    { name: "Save snapshot", status: "pending" },
    { name: "Clean old snapshots", status: "pending" },
  ];

  printHeader("EXPORT PROD SNAPSHOT");
  printSteps();

  // Step 1: Create directory
  const step1Start = Date.now();
  updateStep(0, "running");

  if (!existsSync(SEED_DIR)) {
    mkdirSync(SEED_DIR, { recursive: true });
  }
  updateStep(0, "success", SEED_DIR, (Date.now() - step1Start) / 1000);

  // Steps 2-N: Export each table
  const snapshot: Record<string, unknown[]> = {};
  let allSuccess = true;

  for (const [i, table] of TABLES.entries()) {
    const stepIndex = i + 1;
    const stepStart = Date.now();

    updateStep(stepIndex, "running");

    // Run Convex query to get data
    const result = await runCommand(
      "npx",
      ["convex", "run", "--prod", table.exportFn],
      { silent: true },
    );

    if (!result.success) {
      updateStep(stepIndex, "error", "Query failed");
      allSuccess = false;
      console.log(colors.red + result.output + colors.reset);
      continue;
    }

    try {
      // Parse the JSON output
      const data = JSON.parse(result.output);
      snapshot[table.name] = data;
      const count = Array.isArray(data) ? data.length : 0;
      updateStep(
        stepIndex,
        "success",
        `${count} docs`,
        (Date.now() - stepStart) / 1000,
      );
    } catch {
      updateStep(stepIndex, "error", "Parse failed");
      allSuccess = false;
    }
  }

  if (!allSuccess) {
    console.log(
      `${colors.red}${colors.bold}${symbols.error} Export failed${colors.reset}\n`,
    );
    return false;
  }

  // Save snapshot
  const saveStepIndex = TABLES.length + 1;
  const saveStart = Date.now();
  updateStep(saveStepIndex, "running");

  try {
    writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
    const size = statSync(snapshotFile).size;
    updateStep(
      saveStepIndex,
      "success",
      formatBytes(size),
      (Date.now() - saveStart) / 1000,
    );
  } catch {
    updateStep(saveStepIndex, "error", "Write failed");
    return false;
  }

  // Clean old snapshots
  const cleanStepIndex = TABLES.length + 2;
  const cleanStart = Date.now();
  updateStep(cleanStepIndex, "running");

  const deleted = cleanOldSnapshots();
  const remaining = getSnapshots().length;
  updateStep(
    cleanStepIndex,
    "success",
    deleted > 0 ?
      `Removed ${deleted}, keeping ${remaining}`
    : `${remaining} snapshots`,
    (Date.now() - cleanStart) / 1000,
  );

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `${colors.green}${colors.bold}${symbols.success} Export complete in ${totalTime}s${colors.reset}`,
  );
  console.log(`${colors.dim}  Snapshot: ${snapshotFile}${colors.reset}\n`);

  return true;
};

// ============================================================================
// Import Command
// ============================================================================

const importSnapshot = async (snapshotPath?: string): Promise<boolean> => {
  const startTime = Date.now();
  const snapshotFile = snapshotPath || getLatestSnapshot();

  if (!snapshotFile) {
    console.log(
      `${colors.red}${symbols.error} No snapshot found in ${SEED_DIR}${colors.reset}`,
    );
    console.log(`${colors.dim}  Run: bun run snapshot:export${colors.reset}\n`);
    return false;
  }

  steps = [
    { name: "Load snapshot", status: "pending" },
    ...TABLES.map((t) => ({
      name: `Import ${t.name}`,
      status: "pending" as StepStatus,
    })),
  ];

  printHeader("IMPORT TO DEV");
  printSteps();

  // Step 1: Load snapshot
  const step1Start = Date.now();
  updateStep(0, "running");

  if (!existsSync(snapshotFile)) {
    updateStep(0, "error", "File not found");
    return false;
  }

  let snapshot: Record<string, unknown[]>;
  try {
    const content = await Bun.file(snapshotFile).text();
    snapshot = JSON.parse(content);
    const size = statSync(snapshotFile).size;
    updateStep(
      0,
      "success",
      `${snapshotFile.split("/").pop()} (${formatBytes(size)})`,
      (Date.now() - step1Start) / 1000,
    );
  } catch {
    updateStep(0, "error", "Parse failed");
    return false;
  }

  // Steps 2-N: Import tables
  let allSuccess = true;

  for (const [i, table] of TABLES.entries()) {
    const stepIndex = i + 1;
    const stepStart = Date.now();

    updateStep(stepIndex, "running");

    const data = snapshot[table.name];
    if (!Array.isArray(data)) {
      updateStep(stepIndex, "skipped", "Not in snapshot");
      continue;
    }

    // Write to temp JSONL file
    const tempFile = `/tmp/convex-import-${table.name}-${Date.now()}.jsonl`;
    const jsonlContent = data
      .map((doc) => {
        // Remove Convex internal fields for clean import
        const { _creationTime, _id, ...rest } = doc as Record<string, unknown>;
        return JSON.stringify(rest);
      })
      .join("\n");

    writeFileSync(tempFile, jsonlContent);

    // Import to Convex
    const importResult = await runCommand(
      "npx",
      [
        "convex",
        "import",
        "--table",
        table.name,
        "--replace",
        "-y",
        "--format",
        "jsonLines",
        tempFile,
      ],
      { silent: true },
    );

    // Cleanup temp file
    rmSync(tempFile, { force: true });

    if (!importResult.success) {
      updateStep(stepIndex, "error", "Import failed");
      console.log(colors.dim + importResult.output + colors.reset);
      allSuccess = false;
    } else {
      // Extract document count from output
      const match = /Added (?<count>[\d,]+) documents/.exec(
        importResult.output,
      );
      const count = match?.groups?.count ?? data.length.toString();
      updateStep(
        stepIndex,
        "success",
        `${count} docs`,
        (Date.now() - stepStart) / 1000,
      );
    }
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (allSuccess) {
    console.log(
      `${colors.green}${colors.bold}${symbols.success} Import complete in ${totalTime}s${colors.reset}`,
    );
    console.log(
      `${colors.dim}  Dev deployment ready: https://dashboard.convex.dev${colors.reset}\n`,
    );
  } else {
    console.log(
      `${colors.red}${colors.bold}${symbols.error} Import completed with errors (${totalTime}s)${colors.reset}\n`,
    );
  }

  return allSuccess;
};

// ============================================================================
// Sync Command (Export + Import)
// ============================================================================

const syncSnapshot = async (): Promise<boolean> => {
  console.log(
    `${colors.bold}${colors.magenta}Starting full sync: prod → dev${colors.reset}\n`,
  );

  const exportSuccess = await exportSnapshot();
  if (!exportSuccess) {
    console.log(`${colors.red}Export failed, aborting sync${colors.reset}\n`);
    return false;
  }

  console.log("\n");

  const importSuccess = await importSnapshot();
  if (!importSuccess) {
    console.log(`${colors.red}Import failed${colors.reset}\n`);
    return false;
  }

  console.log(
    `${colors.green}${colors.bold}${symbols.success} Sync complete!${colors.reset}\n`,
  );
  return true;
};

// ============================================================================
// Main
// ============================================================================

const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case "export": {
      await exportSnapshot();
      break;
    }

    case "import": {
      await importSnapshot(process.argv[3]);
      break;
    }

    case "sync": {
      await syncSnapshot();
      break;
    }

    default: {
      console.log(`
${colors.bold}Convex Snapshot Manager${colors.reset}

${colors.cyan}Usage:${colors.reset}
  bun run snapshot:export   Export production data to snapshot
  bun run snapshot:import   Import latest snapshot to dev
  bun run snapshot:sync     Export then import (full sync)

${colors.cyan}Options:${colors.reset}
  bun run snapshot:import <path>   Import specific snapshot file

${colors.cyan}Configuration:${colors.reset}
  Snapshot dir:    ${SEED_DIR}
  Max snapshots:   ${MAX_SNAPSHOTS}
  Tables:          ${TABLES.map((t) => t.name).join(", ")}
`);
      process.exit(1);
    }
  }
};

// Handle interruption
process.on("SIGINT", () => {
  console.log(`\n${colors.red}Interrupted${colors.reset}`);
  process.exit(1);
});

void main();
