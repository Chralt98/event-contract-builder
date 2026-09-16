import { z } from "zod";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";

/** The identifier shared by all stages of one forecast specification workflow. */
export const ForecastSpecificationId = z
  .uuid()
  .describe(
    "Stable identifier for one forecast specification workflow record.",
  );

/** Canonical BCP 47 language tag assigned when a specification is started. */
export const ForecastSpecificationLanguageCode = z
  .string()
  .trim()
  .min(2)
  .max(35)
  .describe(
    "Valid BCP 47 language tag for every forecast-specification field in this workflow, such as de, en, or en-GB. The server canonicalizes it before storage.",
  );

export type ForecastSpecificationLanguageCode = z.infer<
  typeof ForecastSpecificationLanguageCode
>;

/** Normalize equivalent BCP 47 spellings before storing a specification. */
export function canonicalizeForecastSpecificationLanguageCode(
  languageCode: string,
): ForecastSpecificationLanguageCode {
  const canonical = Intl.getCanonicalLocales(languageCode.trim())[0];
  if (!canonical) {
    throw new Error(
      "language_code must be a valid BCP 47 language tag, such as de, en, or en-GB.",
    );
  }
  return ForecastSpecificationLanguageCode.parse(canonical);
}

/** Optional on input so the first draft can create the identifier. */
export const optionalForecastSpecificationId =
  ForecastSpecificationId.optional().describe(
    "Stable forecast specification identifier returned by the previous workflow step; pass it explicitly when the next HTTP call may use a new MCP session, and omit when starting a new forecast specification.",
  );

export const approvalStageSchema = z.enum([
  "selected_unit",
  "defined_terms",
  "resolution_sources",
  "resolution_criteria",
  "background_information",
]);

export type ApprovalStage = z.infer<typeof approvalStageSchema>;

/** Public retrieval shape containing only the approved forecast specification content. */
export const approvedForecastSpecificationRecallSchema = z.object({
  forecast_specification_id: ForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode,
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  definitions: Definitions.optional(),
  resolution_sources: z
    .object({ sources: z.array(DataSource).min(1) })
    .optional(),
  resolution_criteria: ResolutionCriteria.optional(),
  background_information: ForecastBackgroundInformation.optional(),
});

export type ApprovedForecastSpecificationRecall = z.infer<
  typeof approvedForecastSpecificationRecallSchema
>;
