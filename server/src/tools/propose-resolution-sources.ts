import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
  renderSourceProposal,
  renderUnitHeader,
} from "../render";
import { alternativeMarketSchema } from "../source-alternative";
import {
  sourceIndependenceError,
  singleSourceWarning,
  sourceHierarchyRankError,
} from "../source-hierarchy";
import { checkUrl } from "../url-check";

type UrlSource = { url: string };

/**
 * Keep only source candidates whose final HEAD/GET response is exactly HTTP
 * 200. The reachability details remain internal to the proposal preflight.
 */
async function keepHttp200Sources<T extends UrlSource>(
  sources: readonly T[],
): Promise<T[]> {
  const checks = await Promise.all(
    sources.map(
      async (source) => [source, await checkUrl(source.url)] as const,
    ),
  );
  return checks
    .filter(([, result]) => result.status === 200)
    .map(([source]) => source);
}

function closeRanks<T extends { rank: number }>(sources: readonly T[]): T[] {
  return sources.map((source, index) => ({
    ...source,
    rank: index + 1,
  }));
}

/**
 * Concise view of a source: identity plus a clickable locator, so the user can
 * inspect it before approving the hierarchy in Turn 1.
 */
const proposalShape = {
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
        url: z
          .url()
          .describe(
            "Exact source URL shown as a clickable link in the proposal.",
          ),
      }),
    )
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
      "The ranked source hierarchy with clickable URLs; default to a rank-1 primary and a rank-2 fallback from a different independent source agency. A second page, dataset, mirror, or re-publication from the same agency is not an independent fallback. A single rank-1 source is allowed but emits a warning.",
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
      "A follow-up question asking whether this hierarchy is right or should " +
        "add, remove, or reorder any source. If a fallback or primary coverage " +
        "is missing, state that gap and offer the nearby/proxy alternative.",
    ),
};

export function registerProposeResolutionSourcesTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "propose_resolution_sources",
    {
      title: "Propose Resolution Sources",
      description:
        "Store and present the ranked resolution source hierarchy with clickable URLs, for the " +
        "user to approve before the full per-source detail is registered. By " +
        "default include a rank-1 primary source and a rank-2 fallback source. " +
        "A user-requested single rank-1 source is allowed and renders a warning. " +
        "Before rendering, silently keep only candidate URLs whose final response " +
        "is HTTP 200; do not expose the preflight result. " +
        "Call this in the first turn — after identifying the source(s) but before " +
        "submit_resolution_source. Carry contract_id from the definitions result.",
      inputSchema: proposalShape,
      outputSchema: proposalShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    async (args) => {
      const { alternative_market: requestedAlternative, ...proposalArgs } =
        args;
      const [verifiedSources, verifiedAlternativeSources] = await Promise.all([
        keepHttp200Sources(args.sources),
        requestedAlternative
          ? keepHttp200Sources(requestedAlternative.sources)
          : Promise.resolve(undefined),
      ]);

      // Do not return a proposal containing an unverified URL. A generic tool
      // error gives the workflow a chance to source replacement URLs without
      // exposing HTTP statuses or reachability details to the user.
      if (verifiedSources.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No resolution-source proposal is available.",
            },
          ],
          isError: true,
        };
      }

      const sources =
        verifiedSources.length === args.sources.length
          ? verifiedSources
          : closeRanks([...verifiedSources].sort((a, b) => a.rank - b.rank));
      const alternative_market =
        requestedAlternative &&
        verifiedAlternativeSources &&
        verifiedAlternativeSources.length >= 2
          ? {
              ...requestedAlternative,
              sources: verifiedAlternativeSources,
            }
          : undefined;
      const output = {
        ...proposalArgs,
        contract_id: store.resolveContractId(args.contract_id, {
          unitNumber: args.unit_number,
          selectedUnit: args.selected_unit,
        }),
        selected_unit: parseConnectorDraftUnit(args.selected_unit),
        sources,
        ...(alternative_market ? { alternative_market } : {}),
      };
      store.save("proposed_resolution_sources", output);
      const sourceWarning = singleSourceWarning(output.sources.length);
      const coverageAdvice = renderSourceCoverageAdvice(
        output.coverage_gaps,
        output.alternative_market,
      );
      const parts = [
        renderUnitHeader(output.selected_unit, output.unit_number),
        "---",
        "### Resolution Source Hierarchy",
        renderSourceProposal(output.sources),
        ...(sourceWarning ? [sourceWarning] : []),
        ...(coverageAdvice ? [coverageAdvice] : []),
        "---",
        output.followUp,
      ];
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
