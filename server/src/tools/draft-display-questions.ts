import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPrompt } from "../render";

export function registerDraftDisplayQuestionsTool(server: McpServer): void {
  server.registerTool(
    "draft_display_questions",
    {
      title: "Draft Display Questions",
      description:
        "Draft new prediction market display questions from a free-form " +
        "event description. Use only when the user is describing a new event " +
        "to turn into questions — not when they are selecting among questions " +
        "that already exist.",
      inputSchema: {
        event_description: z
          .string()
          .describe(
            "Free-form text describing the event, outcome, or forecast to " +
              "turn into display questions",
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => ({
      content: [
        {
          type: "text" as const,
          text: loadPrompt("draft-display-questions", {
            text: args.event_description,
          }),
        },
      ],
    }),
  );
}
