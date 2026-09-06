import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApprovedContractStore,
  optionalContractId,
} from "../approved-contract-store";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "../connector-draft-unit";
import { renderUnitHeader } from "../render";

const selectedUnitShape = {
  contract_id: optionalContractId,
  unit_number: z
    .number()
    .int()
    .describe("The 1-based number of the unit selected from the draft."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact display-question unit selected from the prior draft or an alternative-market handoff.",
  ),
};

export function registerSubmitSelectedUnitTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "submit_selected_unit",
    {
      title: "Submit Selected Unit",
      description:
        "Validate and store the user's selected display-question unit as a " +
        "pending workflow stage. This submission does not imply approval. " +
        "After the user confirms the selected unit in chat, call " +
        "approve_event_contract with stage selected_unit before approving " +
        "definitions or continuing the workflow.",
      inputSchema: selectedUnitShape,
      outputSchema: selectedUnitShape,
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
      store.save("selected_unit", output);

      return {
        content: [
          {
            type: "text" as const,
            text: renderUnitHeader(output.selected_unit, output.unit_number),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
