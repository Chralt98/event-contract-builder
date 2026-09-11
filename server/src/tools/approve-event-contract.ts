import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApprovedContractStore,
  approvedContractRecallSchema,
  approvalStageSchema,
  optionalContractId,
  projectApprovedContract,
} from "../approved-contract-store";
import { renderApprovedContract } from "../render";

const approvalShape = {
  contract_id: optionalContractId,
  stage: approvalStageSchema.describe(
    "The pending workflow stage the user explicitly approved in chat.",
  ),
};

const approvalOutputSchema = approvedContractRecallSchema.extend({
  approved_stage: approvalStageSchema,
});

export function registerApproveEventContractTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "approve_event_contract",
    {
      title: "Approve Event Contract Stage",
      description:
        "Record an explicit user approval for one pending event-contract " +
        "workflow stage. Call this only after the user has confirmed that " +
        "stage in chat; submit_* tools do not imply approval. Approve stages " +
        "in order: selected_unit, timing, defined_terms, then " +
        "resolution_sources.",
      inputSchema: approvalShape,
      outputSchema: approvalOutputSchema,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    (args) => {
      const record = store.approve(args.stage, args.contract_id);
      const approvedContract = projectApprovedContract(record);
      if (!approvedContract) {
        throw new Error(
          "The approved event-contract projection is empty after approval.",
        );
      }

      const output = {
        ...approvedContract,
        approved_stage: args.stage,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: renderApprovedContract(approvedContract),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
