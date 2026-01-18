/* eslint-disable no-console */
import { spawn } from "node:child_process";

const commands = [
  { color: "\x1b[36m", command: "bun run format", name: "format" }, // Cyan
  { color: "\x1b[33m", command: "bun run lint:fix", name: "lint" }, // Yellow
  { color: "\x1b[32m", command: "bun run typecheck", name: "typecheck" }, // Green
  { color: "\x1b[35m", command: "bun run test", name: "test" }, // Magenta
  { color: "\x1b[34m", command: "bun run test:browser", name: "test:browser" }, // Blue
  { color: "\x1b[95m", command: "bun run test:convex", name: "test:convex" }, // Light Magenta
];

// Clear the terminal
console.clear();

// Get terminal width for pretty formatting
const getTerminalWidth = () => {
  try {
    const { columns } = process.stdout;
    return columns || 80;
  } catch {
    return 80;
  }
};

const terminalWidth = getTerminalWidth();
const resetColor = "\x1b[0m";
const boldText = "\x1b[1m";

// Print header
const printHeader = () => {
  const header = "====== CI CHECKS ======";
  const padding = Math.floor((terminalWidth - header.length) / 2);
  console.log(`\n${" ".repeat(padding)}${boldText}${header}${resetColor}\n`);
};

// Track command status
const status = commands.reduce<
  Record<string, { endTime: number; startTime: number; status: string }>
>((acc, cmd) => {
  acc[cmd.name] = {
    endTime: 0,
    startTime: 0,
    status: "pending",
  };
  return acc;
}, {});

// Print status of all commands
const printStatus = () => {
  console.clear();
  printHeader();

  const maxNameLength = Math.max(...commands.map((cmd) => cmd.name.length));

  commands.forEach((cmd) => {
    const { endTime, startTime, status: cmdStatus } = status[cmd.name];
    let statusText;
    let statusColor;

    if (cmdStatus === "pending") {
      statusText = "PENDING";
      statusColor = "\x1b[90m"; // Gray
    } else if (cmdStatus === "running") {
      statusText = "RUNNING";
      statusColor = "\x1b[33m"; // Yellow
    } else if (cmdStatus === "success") {
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      statusText = `SUCCESS (${duration}s)`;
      statusColor = "\x1b[32m"; // Green
    } else {
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      statusText = `FAILED (${duration}s)`;
      statusColor = "\x1b[31m"; // Red
    }

    console.log(
      `${cmd.color}${cmd.name.padEnd(maxNameLength)}${resetColor} : ${statusColor}${statusText}${resetColor}`,
    );
  });

  console.log("\n");
};

// Run a single command with proper output handling
const runCommand = async (cmd: {
  color: string;
  command: string;
  name: string;
}) => {
  const { color, command, name } = cmd;

  // Update status to running
  status[name].status = "running";
  status[name].startTime = Date.now();
  printStatus();

  console.log(`${color}====== Running ${name} ======${resetColor}`);

  return new Promise<boolean>((resolve) => {
    const childProcess = spawn(command, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Handle stdout
    childProcess.stdout.on("data", (data: Buffer) => {
      const output = data.toString().trim();
      console.log(`${color}${output}${resetColor}`);
    });

    // Handle stderr
    childProcess.stderr.on("data", (data: Buffer) => {
      console.log(`\x1b[31m${data.toString().trim()}${resetColor}`);
    });

    childProcess.on("close", (code) => {
      status[name].endTime = Date.now();
      status[name].status = code === 0 ? "success" : "failed";
      printStatus();

      if (code === 0) {
        console.log(`${color}✓ ${name} completed successfully${resetColor}\n`);
      } else {
        console.log(
          `\x1b[31m✗ ${name} failed with code ${code}${resetColor}\n`,
        );
      }

      resolve(code === 0);
    });
  });
};

// Run all commands
const runAll = async () => {
  const totalStartTime = Date.now();
  printStatus();

  let allSuccess = true;

  for (const cmd of commands) {
    const success = await runCommand(cmd);
    if (!success) {
      allSuccess = false;
      // Don't break; continue running all commands to see all failures
    }
  }

  // Calculate total run time
  const totalEndTime = Date.now();
  const totalDuration = ((totalEndTime - totalStartTime) / 1000).toFixed(2);

  // Final summary
  console.log("\n");
  if (allSuccess) {
    console.log(
      `${boldText}\x1b[32m✓ All checks passed successfully!${resetColor}`,
    );
  } else {
    console.log(
      `${boldText}\x1b[31m✗ Some checks failed. Please fix the issues above.${resetColor}`,
    );
  }

  console.log(`${boldText}\nTotal run time: ${totalDuration}s${resetColor}\n`);

  if (!allSuccess) {
    process.exit(1);
  }
};

// Handle interruption
process.on("SIGINT", () => {
  console.log("\n\x1b[31mProcess interrupted by user\x1b[0m");
  process.exit(1);
});

void runAll();
