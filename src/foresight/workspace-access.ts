import { z } from "zod";
import {
  ForecastSpecificationLanguageCode,
  ForecastSpecificationId,
} from "./workflow";
import { QuestionWorkspaceSnapshot } from "./workspace";

/** Hosted account tools. Authorization is provided by the MCP OAuth connection. */
export const workspaceAccessTools = {
  create_forecast_workspace: {
    title: "Create Forecast Workspace",
    description:
      "Create one editable specification draft in the signed-in account. Each workspace contains one specification.",
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
  list_forecast_workspaces: {
    title: "List Forecast Workspaces",
    description:
      "List the signed-in account's active draft and unexpired archived specifications.",
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
  resume_forecast_workspace: {
    title: "Resume Forecast Workspace",
    description:
      "Resume one of the signed-in account's workspaces by its specification ID.",
    inputSchema: { forecast_specification_id: ForecastSpecificationId },
    outputSchema: z.strictObject({
      status: z.enum(["draft", "archived", "unavailable"]),
      specification: z.unknown().optional(),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
} as const;
