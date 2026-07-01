import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DraftUnit, Definitions } from "../../../src/schema/display-question";
import { renderUnitHeader } from "../render";

const definedTermsShape = {
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: DraftUnit.describe(
    "The selected market unit being defined — same structure as a unit from submit_drafted_questions.",
  ),
  definitions: Definitions.describe(
    "Map from each ambiguous term to its precise, unambiguous definition.",
  ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking the user whether they agree with the " +
        "definitions or would like to change anything.",
    ),
};

export function registerSubmitDefinedTermsTool(server: McpServer): void {
  server.registerTool(
    "submit_defined_terms",
    {
      title: "Submit Defined Terms",
      description:
        "Validate and register a set of term definitions for the event contract. " +
        "Call this once after defining terms, passing the definitions as a " +
        "term-to-definition map.",
      inputSchema: definedTermsShape,
      outputSchema: definedTermsShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const unitHeader = renderUnitHeader(args.selected_unit, args.unit_number);
      const lines = Object.entries(args.definitions).map(
        ([term, definition]) => `**${term}** — ${definition}`,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: [
              unitHeader,
              "---",
              "### Definitions",
              lines.join("\n"),
              "---",
              args.followUp,
            ].join("\n\n"),
          },
        ],
        structuredContent: args,
      };
    },
  );
}
