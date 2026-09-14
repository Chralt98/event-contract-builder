// These instructions are maintained as Markdown for easy editing.
import { readFileSync } from "node:fs";

export const foresightServerInstructions = readFileSync(
  new URL("./instructions.md", import.meta.url),
  "utf8",
);
