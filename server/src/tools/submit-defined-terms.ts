import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Definitions } from "../../../src/schema/display-question";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import {
  ApprovedContractStore,
  optionalContractId,
} from "../approved-contract-store";
import { renderUnitHeader, renderDefinitions } from "../render";

const definedTermsShape = {
  contract_id: optionalContractId,
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft or supplied by an alternative-market handoff.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected market unit being defined — same structure as a unit from submit_drafted_questions or an alternative-market handoff.",
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

export function registerSubmitDefinedTermsTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "submit_defined_terms",
    {
      title: "Submit Defined Terms",
      description:
        "Validate and store a pending set of term definitions for the event " +
        "contract. Call this once after defining terms, passing the definitions as a " +
        "term-to-definition map. When the unit came from an alternative-market " +
        "branch, define its terms from scratch and keep its supplied unit number. " +
        "Carry contract_id from the prior workflow result when continuing a record. " +
        "Submit and explicitly approve the selected unit first. This submission " +
        "does not imply user approval; call approve_event_contract after the user " +
        "agrees to the definitions.",
      inputSchema: definedTermsShape,
      outputSchema: definedTermsShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    (args) => {
      const selectedUnit = parseConnectorDraftUnit(args.selected_unit);
      const output = {
        ...args,
        contract_id: store.resolveContractId(args.contract_id, {
          unitNumber: args.unit_number,
          selectedUnit,
        }),
        selected_unit: selectedUnit,
      };
      store.save("defined_terms", output);
      const unitHeader = renderUnitHeader(
        output.selected_unit,
        output.unit_number,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: [
              unitHeader,
              "---",
              "### Definitions",
              renderDefinitions(output.definitions),
              "---",
              output.followUp,
            ].join("\n\n"),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
