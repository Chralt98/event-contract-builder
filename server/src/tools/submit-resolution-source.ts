import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DataSource } from "../../../src/schema/resolution";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import { renderUnitHeader, renderSources } from "../render";
import { checkUrl } from "../url-check";

const resolutionSourceShape = {
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected market unit being sourced — same structure as a unit from submit_drafted_questions.",
  ),
  sources: z
    .array(DataSource)
    .min(1)
    .describe(
      "The ranked resolution source hierarchy; rank 1 is the primary source that binds first.",
    ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking the user whether the source hierarchy is " +
        "right or would like to change anything.",
    ),
};

export function registerSubmitResolutionSourceTool(server: McpServer): void {
  server.registerTool(
    "submit_resolution_source",
    {
      title: "Submit Resolution Source",
      description:
        "Validate and register the resolution source hierarchy for a market unit. " +
        "Call this once after defining the source(s), passing them as a ranked array.",
      inputSchema: resolutionSourceShape,
      outputSchema: resolutionSourceShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async (args) => {
      const output = {
        ...args,
        selected_unit: parseConnectorDraftUnit(args.selected_unit),
      };
      const unitHeader = renderUnitHeader(
        output.selected_unit,
        output.unit_number,
      );

      // Advisory only: probe each source URL in parallel so typos and dead
      // links surface here, but never block registration of the hierarchy.
      const checks = await Promise.all(
        output.sources.map(
          async (s) => [s.url, await checkUrl(s.url)] as const,
        ),
      );
      const reachability = new Map(checks.map(([url, r]) => [url, r.label]));
      const hasProblems = checks.some(([, r]) => r.severity !== "ok");

      const parts = [
        unitHeader,
        "---",
        "### Resolution Source Hierarchy",
        renderSources(output.sources, reachability),
        "---",
      ];
      if (hasProblems) {
        parts.push(
          "⚠ Some source links could not be automatically verified — review the " +
            "link-check notes above with the user before locking in the hierarchy.",
        );
      }
      parts.push(output.followUp);

      return {
        content: [
          {
            type: "text" as const,
            text: parts.join("\n\n"),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
