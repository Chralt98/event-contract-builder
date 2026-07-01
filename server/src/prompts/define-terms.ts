import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPrompt } from "../render";

export function registerDefineTermsPrompt(server: McpServer): void {
  server.registerPrompt(
    "define-terms",
    {
      title: "Define Terms",
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
            text: loadPrompt("define-terms", { text: args.text }),
          },
        },
      ],
    }),
  );
}
