import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ApprovedContractStore,
  optionalContractId,
} from "../approved-contract-store";
import { parseConnectorDraftUnit } from "../connector-draft-unit";
import { renderTimingSubmission } from "../render";
import { parseTimingPayload, timingPayloadShape } from "../timing";

const timingSubmissionShape = {
  contract_id: optionalContractId,
  ...timingPayloadShape,
};

const timingSubmissionSchema = z.object(timingSubmissionShape);

export function registerSubmitTimingTool(
  server: McpServer,
  store: ApprovedContractStore,
): void {
  server.registerTool(
    "submit_timing",
    {
      title: "Submit Event Contract Timing",
      description:
        "Validate and store the user's final event-contract timing after " +
        "the define-timing skill's conversational proposal is confirmed. Include the complete event " +
        "deadline or measurement observation window, evidence rule, trading " +
        "schedule, expiration datetime, UTC timestamps, IANA time zones, and " +
        "boundary rules. Call only after the define-timing skill has presented " +
        "its proposal and selected-unit approval is recorded. The user's " +
        "confirmation of that conversational proposal is the timing approval; " +
        "immediately follow this tool with approve_event_contract at stage timing " +
        "without asking for a second timing confirmation.",
      inputSchema: timingSubmissionShape,
      outputSchema: timingSubmissionShape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    (args) => {
      const parsed = timingSubmissionSchema.parse(args);
      const selectedUnit = parseConnectorDraftUnit(parsed.selected_unit);
      const contractId = store.resolveContractId(parsed.contract_id, {
        unitNumber: parsed.unit_number,
        selectedUnit,
      });
      store.requireApprovedStage(contractId, "selected_unit");

      const output = {
        ...parseTimingPayload(parsed),
        contract_id: contractId,
      };
      store.save("timing", output);

      return {
        content: [
          {
            type: "text" as const,
            text: renderTimingSubmission(
              output,
              output.selected_unit,
              output.unit_number,
            ),
          },
        ],
        structuredContent: output,
      };
    },
  );
}
