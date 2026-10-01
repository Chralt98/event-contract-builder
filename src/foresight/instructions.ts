// The Markdown remains the sole source; Bun inlines it when building the package.
import instructions from "./instructions.md" with { type: "text" };

export const foresightServerInstructions = instructions;
