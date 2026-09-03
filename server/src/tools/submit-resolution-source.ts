import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DataSource } from "../../../src/schema/resolution";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import { renderUnitHeader, renderSources } from "../render";
import {
  singleSourceWarning,
  sourceHierarchyRankError,
} from "../source-hierarchy";
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
    .min(1, "At least one rank-1 primary source is required.")
    .superRefine((sources, ctx) => {
      const error = sourceHierarchyRankError(sources);
      if (error) ctx.addIssue({ code: "custom", message: error });
    })
    .describe(
      "The ranked resolution source hierarchy; default to rank 1 as the primary and rank 2 as the fallback. A single rank-1 source is allowed but emits a warning.",
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
        "By default pass a rank-1 primary and a rank-2 fallback in the ranked " +
        "array. A user-requested single rank-1 source is valid but emits a " +
        "warning. Call this once after the hierarchy is approved.",
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
      const sourceWarning = singleSourceWarning(output.sources.length);

      const parts = [
        unitHeader,
        "---",
        "### Resolution Source Hierarchy",
        renderSources(output.sources, reachability),
        ...(sourceWarning ? [sourceWarning] : []),
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
