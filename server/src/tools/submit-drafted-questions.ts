import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import { renderDraftUnits } from "../render";

const draftedQuestionsShape = {
  units: z
    .array(ConnectorDraftUnit)
    .describe(
      "The drafted markets, each a single selectable unit: a binary question, " +
        "the complete set of questions for one scalar or categorical market, " +
        "or an additional placeholder-bearing template with its allowed values.",
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
        "organized into binary/scalar/categorical/template units. Call this once " +
        "after the model has drafted questions for a new event, passing " +
        "the draft as structured units.",
      inputSchema: draftedQuestionsShape,
      outputSchema: draftedQuestionsShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const output = {
        ...args,
        units: args.units.map(parseConnectorDraftUnit),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: [renderDraftUnits(output.units), "---", output.followUp].join(
              "\n\n",
            ),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
