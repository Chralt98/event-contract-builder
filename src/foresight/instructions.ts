// The Markdown remains the sole source; Bun inlines it when building the package.
import instructions from "./instructions.md" with { type: "text" };

export const foresightServerInstructions = instructions;

// Discovery is repeated in each Codex plugin tool's budget; stage preparation
// delivers the complete policy. Keep both surfaces sourced from this Markdown.
export const foresightDiscoveryInstructions = instructions
  .split("\n## Runtime policy\n", 1)[0]!
  .trim();
