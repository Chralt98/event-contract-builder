import { z } from "zod";
import {
  ForecastSpecificationLanguageCode,
  ForecastSpecificationId,
} from "./workflow";
import { QuestionWorkspaceSnapshot } from "./workspace";

/** Hosted account tools. Authorization is provided by the MCP OAuth connection. */
export const workspaceAccessTools = {
  create_forecast_specification: {
    title: "Create Forecast Specification",
    description:
      "Create one editable forecast specification draft. Use when the user wants to start a forecast specification they can develop and revisit.",
    inputSchema: { language_code: ForecastSpecificationLanguageCode },
    outputSchema: z.strictObject({
      forecast_specification_id: ForecastSpecificationId,
      workspace: QuestionWorkspaceSnapshot,
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  list_forecast_specifications: {
    title: "List Forecast Specifications",
    description:
      "List the forecast specifications available to the current user, including active drafts and archived specifications that have not expired. Use when the user wants to find a saved specification to resume or review.",
    inputSchema: {},
    outputSchema: z.strictObject({
      workspaces: z.array(
        z.strictObject({
          forecast_specification_id: ForecastSpecificationId,
          status: z.enum(["draft", "archived"]),
          expires_at: z.number().int(),
        }),
      ),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
} as const;
