import { z } from "zod";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";
import { ForecastNewsTimeline } from "./news-timeline";
import { alternativeForecastSpecificationSchema } from "./source-alternative";
import {
  sourceHierarchyRankError,
  sourceIndependenceError,
} from "./source-validation";
import {
  optionalForecastSpecificationId,
  ForecastSpecificationId,
  ForecastSpecificationLanguageCode,
  approvalStageSchema,
  approvedForecastSpecificationRecallSchema,
} from "./workflow";

export const approvalShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  stage: approvalStageSchema.describe(
    "The pending workflow stage the user explicitly approved in chat.",
  ),
};

export const ReviewMarkdown = z
  .string()
  .min(1)
  .describe(
    "Canonical complete Markdown review. Present this exact string verbatim to the user without summarizing, reordering, or adding content.",
  );

export const approvalOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId.optional(),
    language_code: ForecastSpecificationLanguageCode.optional(),
    unit_number: z.number().int().optional(),
    selected_unit: ConnectorDraftUnit.optional(),
    approved_stage: approvalStageSchema,
    review_markdown: ReviewMarkdown,
  })
  .strict()
  .superRefine((value, ctx) => {
    const isFinal =
      value.approved_stage === "background_information" ||
      value.approved_stage === "news_timeline";
    const internalFields = [
      "forecast_specification_id",
      "language_code",
      "unit_number",
      "selected_unit",
    ] as const;

    if (isFinal) {
      for (const field of internalFields) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message:
              "Final approval must not expose internal workflow metadata.",
          });
        }
      }
      return;
    }

    for (const field of internalFields) {
      if (value[field] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Intermediate approval must identify the approved unit.",
        });
      }
    }
  });

export const approvedForecastSpecificationLookupShape = {
  forecast_specification_id: optionalForecastSpecificationId,
};

export const definedTermsShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit being defined.",
  ),
  definitions: Definitions.describe(
    "Map from each ambiguous term to its precise, unambiguous definition.",
  ),
  followUp: z
    .string()
    .describe("Ask whether the definitions are approved or need changes."),
};

export const draftedQuestionsShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode.describe(
    "Immutable canonical BCP 47 language for this new record.",
  ),
  units: z
    .array(ConnectorDraftUnit)
    .min(
      3,
      "A new forecast draft must contain at least three distinct selectable forecast specification units.",
    )
    .superRefine((units, ctx) => {
      const signatures = units.map(({ type, question, variables }) =>
        JSON.stringify({ type, question, variables }),
      );

      if (new Set(signatures).size !== signatures.length) {
        ctx.addIssue({
          code: "custom",
          message: "Drafted forecast specification units must be distinct.",
        });
      }
    })
    .describe(
      "At least three distinct selectable units, including a direct interpretation and intent-preserving alternatives.",
    ),
  followUp: z
    .string()
    .describe(
      "Ask which unit to use or revise, noting that term definition comes next.",
    ),
};

export const resolutionSourceShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit being sourced.",
  ),
  sources: z
    .array(DataSource)
    .min(1, "At least one rank-1 primary source is required.")
    .superRefine((sources, ctx) => {
      const error = sourceHierarchyRankError(sources);
      if (error) ctx.addIssue({ code: "custom", message: error });
      const independenceError = sourceIndependenceError(sources);
      if (independenceError) {
        ctx.addIssue({ code: "custom", message: independenceError });
      }
    })
    .describe(
      "Ranked source hierarchy; prefer an independent primary and fallback.",
    ),
  coverage_gaps: z
    .array(z.string().min(3))
    .min(1)
    .max(12)
    .optional()
    .describe("Required facts lacking authoritative primary coverage."),
  alternative_forecast_specification: alternativeForecastSpecificationSchema
    .optional()
    .describe(
      "A sourceable nearby or proxy unit proposed when coverage is inadequate.",
    ),
  followUp: z
    .string()
    .describe(
      "Ask whether to approve or revise the hierarchy and present required gap options.",
    ),
};

export const resolutionCriteriaShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit receiving criteria.",
  ),
  resolution_criteria: ResolutionCriteria.describe(
    "Source-grounded rules covering every represented binary question.",
  ),
  followUp: z
    .string()
    .describe("Ask whether the criteria are approved or need changes."),
};

export const backgroundInformationShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit receiving background information.",
  ),
  background_information: ForecastBackgroundInformation.describe(
    "Neutral explanatory context with optional public references.",
  ),
  followUp: z
    .string()
    .describe("Ask whether the background is approved or needs changes."),
};

export const newsTimelineShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected forecast unit number, not a news-item number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit receiving optional news.",
  ),
  news_timeline: ForecastNewsTimeline.describe(
    "Newest-first, incremental factual news; empty only for requested removal.",
  ),
  followUp: z
    .string()
    .describe("Ask which news-item numbers to keep or revise."),
};

export const selectedUnitShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode.describe(
    "Existing record language, or target language for an explicit new record.",
  ),
  start_new_specification: z
    .boolean()
    .optional()
    .describe(
      "True only for a separate alternative or translated record; then omit the old ID.",
    ),
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact unit selected from a draft or alternative handoff.",
  ),
};

const workflowOutput = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .extend({
      forecast_specification_id: ForecastSpecificationId,
      language_code: ForecastSpecificationLanguageCode,
      review_markdown: ReviewMarkdown,
    })
    .strict();

export const draftedQuestionsOutputSchema = workflowOutput({
  ...draftedQuestionsShape,
});
export const definedTermsOutputSchema = workflowOutput({
  ...definedTermsShape,
});
export const resolutionSourceOutputSchema = workflowOutput({
  ...resolutionSourceShape,
});
export const resolutionCriteriaOutputSchema = workflowOutput({
  ...resolutionCriteriaShape,
});
export const backgroundInformationOutputSchema = workflowOutput({
  ...backgroundInformationShape,
});
export const newsTimelineOutputSchema = workflowOutput({
  ...newsTimelineShape,
});
export const selectedUnitOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    unit_number: selectedUnitShape.unit_number,
    selected_unit: selectedUnitShape.selected_unit,
    review_markdown: ReviewMarkdown,
  })
  .strict();

/** Client-visible MCP contract. Execution is provided by the private backend. */
export const foresightTools = {
  approve_forecast_specification: {
    title: "Approve Forecast Specification Stage",
    description:
      "Approve one pending workflow stage after the user explicitly accepts its rendered review. Submissions remain pending until this tool succeeds.",
    inputSchema: approvalShape,
    outputSchema: approvalOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  get_approved_forecast_specification: {
    title: "Get Approved Forecast Specification",
    description:
      "Retrieve the approved stages of one Forecast Specification. Omit the ID only for the current session's most recently updated record; provide it for an explicit HTTP handoff.",
    inputSchema: approvedForecastSpecificationLookupShape,
    outputSchema: approvedForecastSpecificationRecallSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  submit_defined_terms: {
    title: "Submit Defined Terms",
    description:
      "Validate, store, and render pending definitions for an approved selected unit, using the exact unit and a term-to-definition map.",
    inputSchema: definedTermsShape,
    outputSchema: definedTermsOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_drafted_questions: {
    title: "Submit Drafted Questions",
    description:
      "Validate, store, and render a new draft of selectable binary, scalar, categorical, or template units. This starts a record with an immutable specification language.",
    inputSchema: draftedQuestionsShape,
    outputSchema: draftedQuestionsOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_resolution_source: {
    title: "Resolution Source Hierarchy",
    description:
      "Validate, store, and render a pending ranked source hierarchy after definitions are approved, including gaps or a proposed alternative when applicable.",
    inputSchema: resolutionSourceShape,
    outputSchema: resolutionSourceOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_resolution_criteria: {
    title: "Resolution Criteria",
    description:
      "Validate, store, and render pending source-grounded criteria for every binary question represented by an exact unit after source approval.",
    inputSchema: resolutionCriteriaShape,
    outputSchema: resolutionCriteriaOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_background_information: {
    title: "Context and Background Information",
    description:
      "Validate, store, and render pending neutral background information after criteria approval; references are explanatory only.",
    inputSchema: backgroundInformationShape,
    outputSchema: backgroundInformationOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_news_timeline: {
    title: "Submit Relevant News Timeline",
    description:
      "Validate, store, and render an optional newest-first news timeline after explicit opt-in and background approval. Use an empty timeline only to review removal of previously approved news.",
    inputSchema: newsTimelineShape,
    outputSchema: newsTimelineOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_selected_unit: {
    title: "Submit Selected Unit",
    description:
      "Validate and store the exact selected display-question unit as pending. Start a new record only for a separate alternative or language branch.",
    inputSchema: selectedUnitShape,
    outputSchema: selectedUnitOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
} as const;

export type ForesightToolName = keyof typeof foresightTools;
