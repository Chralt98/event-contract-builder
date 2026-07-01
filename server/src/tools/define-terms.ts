import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DraftUnit } from "../../../src/schema/display-question";
import { loadPrompt, renderUnitHeader } from "../render";

export function registerDefineTermsTool(server: McpServer): void {
  server.registerTool(
    "define_terms",
    {
      title: "Define Terms",
      description:
        "Identify ambiguous terms in a selected market unit and propose " +
        "precise definitions for each. Use whenever the user selects, confirms, " +
        "or chooses a market unit.",
      inputSchema: {
        unit_number: z
          .number()
          .int()
          .describe(
            "The 1-based number of the selected unit as shown in the prior draft.",
          ),
        selected_unit: DraftUnit.describe(
          "The market unit to analyze for ambiguous terms — same structure as a unit from submit_drafted_questions",
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const unit = args.selected_unit;
      const unitText =
        unit.type === "binary" ? unit.question : unit.questions.join("\n");
      return {
        content: [
          {
            type: "text" as const,
            text: [
              renderUnitHeader(unit, args.unit_number),
              loadPrompt("define-terms", { text: unitText }),
            ].join("\n\n"),
          },
        ],
      };
    },
  );
}
