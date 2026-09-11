import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApprovedContractStore,
  approvedContractRecallSchema,
  optionalContractId,
  projectApprovedContract,
} from "../approved-contract-store";
import { renderApprovedContract } from "../render";

const approvedContractLookupShape = {
  contract_id: optionalContractId,
};

export function registerGetApprovedEventContractTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "get_approved_event_contract",
    {
      title: "Get Approved Event Contract",
      description:
        "Retrieve the approved selected unit, timing, definitions, and resolution " +
        "source records saved during this chat; candidate drafts and workflow prompts " +
        "are not returned. " +
        "Omit contract_id for the most recently updated contract only in the " +
        "current MCP session, or provide the stable identifier returned by a " +
        "workflow tool for an explicit cross-session HTTP handoff.",
      inputSchema: approvedContractLookupShape,
      outputSchema: approvedContractRecallSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const record = store.get(args.contract_id);
      const approvedContract = record
        ? projectApprovedContract(record)
        : undefined;
      if (!approvedContract) {
        return {
          content: [
            {
              type: "text" as const,
              text: args.contract_id
                ? `No approved event contract was found for contract_id ${args.contract_id}.`
                : "No approved event-contract information is available in this chat.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: renderApprovedContract(approvedContract),
          },
        ],
        structuredContent: approvedContract,
      };
    },
  );
}
