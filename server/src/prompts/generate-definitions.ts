import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPrompt } from "../render";

export function registerGenerateDefinitionsPrompt(server: McpServer): void {
  server.registerPrompt(
    "generate-definitions",
    {
      title: "Generate Definitions",
      description:
        "Identify ambiguous terms in a prediction market display question and propose precise definitions for each.",
      argsSchema: {
        text: z
          .string()
          .describe("The prediction market display question to analyze"),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("generate-definitions", { text: args.text }),
          },
        },
      ],
    }),
  );
}
