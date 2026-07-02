import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DraftUnit } from "../../../src/schema/display-question";
import { renderDraftUnits } from "../render";

const draftDisplayQuestionsOutputShape = {
  units: z
    .array(DraftUnit)
    .describe(
      "The drafted markets, each a single selectable unit: a binary question, " +
        "or the complete set of questions for one scalar or categorical market.",
    ),
  followUp: z
    .string()
    .describe(
      "The required follow-up line asking which unit to use for further " +
        "specification, or how the draft should be revised. Include a hint " +
        "about the next step: once the user is satisfied and selects a unit, " +
        "the specific words and terms in that question will be defined.",
    ),
};

export function registerSubmitDraftedQuestionsTool(server: McpServer): void {
  server.registerTool(
    "submit_drafted_questions",
    {
      title: "Submit Drafted Questions",
      description:
        "Validate and register a drafted set of display questions, " +
        "organized into binary/scalar/categorical units per " +
        "draft_display_questions guidance. Call this once after drafting " +
        "questions for a new event, passing the same draft as structured " +
        "units.",
      inputSchema: draftDisplayQuestionsOutputShape,
      outputSchema: draftDisplayQuestionsOutputShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => ({
      content: [
        {
          type: "text" as const,
          text: [renderDraftUnits(args.units), "---", args.followUp].join(
            "\n\n",
          ),
        },
      ],
      structuredContent: args,
    }),
  );
}
