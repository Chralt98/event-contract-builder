import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Prevent stale outputs from older entrypoints entering the package artifact.
await rm(resolve(root, "dist"), { recursive: true, force: true });
for (const command of [
  [
    "bun",
    "build",
    "./index.ts",
    "./src/index.ts",
    "./src/foresight/index.ts",
    "--outdir",
    "./dist",
    "--target",
    "node",
    "--format",
    "esm",
    "--external",
    "zod",
  ],
  ["bun", "x", "--no-install", "tsc", "-p", "tsconfig.build.json"],
]) {
  const child = Bun.spawn(command, {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}
