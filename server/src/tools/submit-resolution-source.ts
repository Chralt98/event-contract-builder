import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DataSource } from "../../../src/schema/resolution";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import {
  ApprovedContractStore,
  optionalContractId,
} from "../approved-contract-store";
import {
  renderSourceCoverageAdvice,
  renderSources,
  renderUnitHeader,
} from "../render";
import { alternativeMarketSchema } from "../source-alternative";
import {
  sourceIndependenceError,
  singleSourceWarning,
  sourceHierarchyRankError,
} from "../source-hierarchy";
import { checkUrl } from "../url-check";

const resolutionSourceShape = {
  contract_id: optionalContractId,
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
      const independenceError = sourceIndependenceError(sources);
      if (independenceError) {
        ctx.addIssue({ code: "custom", message: independenceError });
      }
    })
    .describe(
      "The ranked resolution source hierarchy; default to a rank-1 primary and a rank-2 fallback from a different independent source agency. A second page, dataset, mirror, or re-publication from the same agency is not an independent fallback. A single rank-1 source is allowed but emits a warning.",
    ),
  coverage_gaps: z
    .array(z.string().min(3))
    .min(1)
    .max(12)
    .optional()
    .describe(
      "Facts required by the selected market for which no authoritative primary source was found. Omit when every required fact has primary coverage.",
    ),
  alternative_market: alternativeMarketSchema
    .optional()
    .describe(
      "A newly drafted nearby or proxy display-question unit with at least two independent source agencies, required by the workflow when source coverage is incomplete or no independent fallback can be found. This is a question proposal, not term definitions; only pass it as selected_unit to define-terms after the user chooses it.",
    ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking the user whether the source hierarchy is " +
        "right or would like to change anything. If a fallback or primary " +
        "coverage is missing, state that gap and offer the nearby/proxy alternative.",
    ),
};

export function registerSubmitResolutionSourceTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "submit_resolution_source",
    {
      title: "Submit Resolution Source",
      description:
        "Validate and store a pending resolution source hierarchy for a market " +
        "unit. " +
        "By default pass a rank-1 primary and a rank-2 fallback in the ranked " +
        "array. A user-requested single rank-1 source is valid but emits a " +
        "warning. Call this once after the hierarchy is approved, carrying the " +
        "contract_id from propose_resolution_sources. This submission does not " +
        "imply approval of the detailed sources; call approve_event_contract " +
        "after the user agrees to them.",
      inputSchema: resolutionSourceShape,
      outputSchema: resolutionSourceShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      const selectedUnit = parseConnectorDraftUnit(args.selected_unit);
      const output = {
        ...args,
        contract_id: store.resolveContractId(args.contract_id, {
          unitNumber: args.unit_number,
          selectedUnit,
        }),
        selected_unit: selectedUnit,
      };
      const unitHeader = renderUnitHeader(
        output.selected_unit,
        output.unit_number,
      );

      // Advisory only: validate every source URL in parallel. Keep individual
      // reachability results out of the user-facing Markdown, but retain one
      // aggregate warning when a source is unavailable.
      const checks = await Promise.all(
        output.sources.map(
          async (source) => [source, await checkUrl(source.url)] as const,
        ),
      );
      const hasProblems =
        checks.some(([, result]) => result.severity !== "ok") ||
        output.sources.some((source) => !source.publiclyAccessible);

      const sourceWarning = singleSourceWarning(output.sources.length);
      const coverageAdvice = renderSourceCoverageAdvice(
        output.coverage_gaps,
        output.alternative_market,
      );

      const parts = [
        unitHeader,
        "---",
        "### Resolution Source Hierarchy",
        renderSources(output.sources),
        ...(sourceWarning ? [sourceWarning] : []),
        ...(coverageAdvice ? [coverageAdvice] : []),
        "---",
      ];
      if (hasProblems) {
        parts.push(
          "⚠ One or more resolution sources are not publicly accessible or " +
            "could not be automatically verified — review the source URLs " +
            "before locking in the hierarchy.",
        );
      }
      parts.push(output.followUp);

      store.save("resolution_sources", output);

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
