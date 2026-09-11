import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import type { DraftUnitT } from "../../../src/schema/display-question";
import {
  ApprovedContractStore,
  optionalContractId,
} from "../approved-contract-store";
import { renderDraftUnits } from "../render";

/**
 * Scalar and categorical drafts describe a family of related concrete
 * questions. Keep the family usable as a reusable market template as well as
 * the concrete draft. The skill creates the template; this server-side check
 * prevents an incomplete payload from being persisted when the model omits it.
 */
function assertTemplateCoverage(units: DraftUnitT[]): void {
  const groupedMarketCount = units.filter(
    (unit) => unit.type === "scalar" || unit.type === "categorical",
  ).length;
  const templateCount = units.filter((unit) => unit.type === "template").length;

  if (templateCount < groupedMarketCount) {
    throw new Error(
      "Every scalar or categorical market must include an additional template market.",
    );
  }
}

const draftedQuestionsShape = {
  contract_id: optionalContractId,
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
        "about the next steps: after the user selects a unit, first propose " +
        "and review its timing; only after timing is approved should the " +
        "specific words and terms in that question be defined.",
    ),
};

export function registerSubmitDraftedQuestionsTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "submit_drafted_questions",
    {
      title: "Submit Drafted Questions",
      description:
        "Validate and store a drafted set of display questions, " +
        "organized into binary/scalar/categorical/template units. Call this once " +
        "after the model has drafted questions for a new event, passing " +
        "the draft as structured units. A contract_id is returned for later " +
        "workflow steps; carry it explicitly when a later HTTP call may use a " +
        "new MCP session.",
      inputSchema: draftedQuestionsShape,
      outputSchema: draftedQuestionsShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    (args) => {
      const parsedUnits = args.units.map(parseConnectorDraftUnit);
      assertTemplateCoverage(parsedUnits);

      const output = {
        ...args,
        contract_id: store.resolveContractId(args.contract_id),
        units: parsedUnits,
      };
      store.save("drafted_questions", output);

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
