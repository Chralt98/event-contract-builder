import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPrompt } from "../render";

export function registerDraftDisplayQuestionsPrompt(server: McpServer): void {
  server.registerPrompt(
    "draft-display-questions",
    {
      title: "Draft Display Questions",
      description:
        "Draft prediction market display questions from free-form text input.",
      argsSchema: {
        text: z
          .string()
          .describe(
            "Free-form text describing the event, outcome, or forecast to turn into display questions",
          ),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("draft-display-questions", {
              text: args.text,
            }),
          },
        },
      ],
    }),
  );
}
