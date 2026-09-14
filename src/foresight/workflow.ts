import { z } from "zod";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";

/** The identifier shared by all stages of one forecast specification workflow. */
export const ForecastSpecificationId = z
  .uuid()
  .describe(
    "Stable identifier for one forecast specification workflow record.",
  );

/** Optional on input so the first draft can create the identifier. */
export const optionalForecastSpecificationId =
  ForecastSpecificationId.optional().describe(
    "Stable forecast specification identifier returned by the previous workflow step; pass it explicitly when the next HTTP call may use a new MCP session, and omit when starting a new forecast specification.",
  );

export const approvalStageSchema = z.enum([
  "selected_unit",
  "defined_terms",
  "resolution_sources",
]);

export type ApprovalStage = z.infer<typeof approvalStageSchema>;

/** Public retrieval shape containing only the approved forecast specification content. */
export const approvedForecastSpecificationRecallSchema = z.object({
  forecast_specification_id: ForecastSpecificationId,
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  definitions: Definitions.optional(),
  resolution_sources: z
    .object({ sources: z.array(DataSource).min(1) })
    .optional(),
});

export type ApprovedForecastSpecificationRecall = z.infer<
  typeof approvedForecastSpecificationRecallSchema
>;
