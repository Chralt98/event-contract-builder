import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DraftUnit, Definitions } from "../../../src/schema/display-question";
import { loadPrompt, renderUnitHeader, renderDefinitions } from "../render";

export function registerDefineResolutionSourceTool(server: McpServer): void {
  server.registerTool(
    "define_resolution_source",
    {
      title: "Define Resolution Source",
      description:
        "Identify the authoritative data source(s) that will settle a selected " +
        "market unit and rank them into a fixed fallback hierarchy. Use after " +
        "the user has agreed the term definitions for the unit.",
      inputSchema: {
        unit_number: z
          .number()
          .int()
          .describe(
            "The 1-based number of the selected unit as shown in the prior draft.",
          ),
        selected_unit: DraftUnit.describe(
          "The market unit to source — same structure as a unit from submit_drafted_questions.",
        ),
        definitions: Definitions.describe(
          "The agreed term definitions for the unit, so sources resolve against the definitions rather than the raw wording.",
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
          text: loadPrompt("define-resolution-source", {
            unitHeader: renderUnitHeader(args.selected_unit, args.unit_number),
            definitions: renderDefinitions(args.definitions),
          }),
        },
      ],
    }),
  );
}
