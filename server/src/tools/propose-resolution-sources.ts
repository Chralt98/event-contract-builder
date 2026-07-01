import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DraftUnit } from "../../../src/schema/display-question";
import { renderUnitHeader, renderSourceProposal } from "../render";

/**
 * Names-only view of a source: just enough to let the user approve the
 * hierarchy before the full per-source records are worked up in Turn 2.
 */
const proposalShape = {
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: DraftUnit.describe(
    "The selected market unit being sourced — same structure as a unit from submit_drafted_questions.",
  ),
  sources: z
    .array(
      z.object({
        rank: z
          .number()
          .int()
          .min(1)
          .describe("Hierarchy rank; 1 = primary source that binds first."),
        name: z.string().min(3),
        publisher: z
          .string()
          .min(2)
          .describe("Organization that produces the data."),
      }),
    )
    .min(1)
    .describe(
      "The ranked source hierarchy as names only; rank 1 is the primary source.",
    ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking whether this hierarchy is right or should " +
        "add, remove, or reorder any source.",
    ),
};

export function registerProposeResolutionSourcesTool(server: McpServer): void {
  server.registerTool(
    "propose_resolution_sources",
    {
      title: "Propose Resolution Sources",
      description:
        "Present the ranked resolution source hierarchy as names only, for the " +
        "user to approve before the full per-source detail is registered. Call " +
        "this in the first turn — after identifying the source(s) but before " +
        "submit_resolution_source.",
      inputSchema: proposalShape,
      outputSchema: proposalShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const parts = [
        renderUnitHeader(args.selected_unit, args.unit_number),
        "---",
        "### Resolution Source Hierarchy",
        renderSourceProposal(args.sources),
        "---",
        args.followUp,
      ];
      return {
        content: [
          {
            type: "text" as const,
            text: parts.join("\n\n"),
          },
        ],
        structuredContent: args,
      };
    },
  );
}
