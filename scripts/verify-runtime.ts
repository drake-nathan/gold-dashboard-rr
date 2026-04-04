import { execFile } from "node:child_process";
import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";

const execFileAsync = (cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    execFile(
      "node",
      ["--import", "./instrument.server.js", "--eval", ""],
      {
        cwd,
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV ?? "production",
        },
      },
      (error) => {
        if (error) {
          reject(error instanceof Error ? error : new Error("Runtime verification failed"));
          return;
        }

        resolve();
      },
    );
  });

const runtimeDir = await mkdtemp(join(tmpdir(), "gold-dashboard-runtime-"));
const packageJsonPath = join(runtimeDir, "package.json");
const instrumentPath = join(runtimeDir, "instrument.server.js");
const nodeModulesPath = join(runtimeDir, "node_modules");

await writeFile(
  packageJsonPath,
  JSON.stringify(
    {
      private: true,
      type: "module",
    },
    null,
    2,
  ),
);

await writeFile(instrumentPath, await Bun.file(resolvePath("instrument.server.js")).text());

await symlink(resolvePath("node_modules"), nodeModulesPath, "junction");

await execFileAsync(runtimeDir);
