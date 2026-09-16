import { z } from "zod";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";
import { alternativeForecastSpecificationSchema } from "./source-alternative";
import {
  forecastSpecificationExportInputSchema,
  forecastSpecificationExportOutputSchema,
} from "./exports";
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

const forecastQuestionLinesSchema = z
  .array(z.string().min(1))
  .min(1)
  .describe(
    "The exact approved question text in unit order. Binary and template units use one item; scalar and categorical units include each question.",
  );

export const approvalOutputSchema = approvedForecastSpecificationRecallSchema
  .partial()
  .extend({
    forecast_specification_id:
      approvedForecastSpecificationRecallSchema.shape.forecast_specification_id,
    language_code: ForecastSpecificationLanguageCode,
    approved_stage: approvalStageSchema,
    forecast_question: forecastQuestionLinesSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.approved_stage === "background_information") {
      if (!value.forecast_question) {
        ctx.addIssue({
          code: "custom",
          path: ["forecast_question"],
          message:
            "Final approval must return the exact approved forecast question.",
        });
      }

      for (const field of [
        "unit_number",
        "selected_unit",
        "definitions",
        "resolution_sources",
        "resolution_criteria",
        "background_information",
      ] as const) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message:
              "Final approval returns only the forecast specification ID and question; retrieve the full specification only if the user chooses to see it.",
          });
        }
      }
      return;
    }

    if (value.unit_number === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["unit_number"],
        message: "Stage approval must include the selected unit number.",
      });
    }
    if (value.selected_unit === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["selected_unit"],
        message: "Stage approval must include the selected unit.",
      });
    }
    if (value.forecast_question !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["forecast_question"],
        message:
          "The forecast question summary is only returned after final approval.",
      });
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
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft or supplied by an alternative forecast specification handoff.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected forecast specification unit being defined — same structure as a unit from submit_drafted_questions or an alternative forecast specification handoff.",
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

export const draftedQuestionsShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode.describe(
    "The canonical BCP 47 language tag chosen for this new forecast specification. Every specification field and workflow follow-up must use this language for the lifetime of this record.",
  ),
  units: z
    .array(ConnectorDraftUnit)
    .min(
      3,
      "A new forecast draft must contain at least three distinct selectable forecast specification units.",
    )
    .superRefine((units, ctx) => {
      const signatures = units.map(({ type, question, questions, variables }) =>
        JSON.stringify({ type, question, questions, variables }),
      );

      if (new Set(signatures).size !== signatures.length) {
        ctx.addIssue({
          code: "custom",
          message: "Drafted forecast specification units must be distinct.",
        });
      }
    })
    .describe(
      "At least three distinct drafted forecast specifications, each a single selectable unit: a binary question, " +
        "the complete set of questions for one scalar or categorical forecast specification, " +
        "or an additional placeholder-bearing template with finite, explicit values. " +
        "A template is optional and valid only when every allowed value and meaningful combination preserves the same qualifying predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis; otherwise draft separate units. " +
        "Include a direct interpretation and close reformulation or proxy interpretations that preserve the user's intent.",
    ),
  followUp: z
    .string()
    .describe(
      "The required follow-up line asking which unit to use for further " +
        "specification, or how the draft should be revised. Include a hint " +
        "about the next steps: after the user selects a unit, define its " +
        "ambiguous terms before reviewing resolution sources.",
    ),
};

export const resolutionSourceShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected forecast specification unit being sourced — same structure as a unit from submit_drafted_questions.",
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
      "The ranked resolution source hierarchy; default to a rank-1 primary and a rank-2 fallback from a different independent source agency. A second page, dataset, mirror, or re-publication from the same agency is not an independent fallback. A single rank-1 source is allowed but emits a warning.",
    ),
  coverage_gaps: z
    .array(z.string().min(3))
    .min(1)
    .max(12)
    .optional()
    .describe(
      "Facts required by the selected forecast specification for which no authoritative primary source was found. Omit when every required fact has primary coverage.",
    ),
  alternative_forecast_specification: alternativeForecastSpecificationSchema
    .optional()
    .describe(
      "A newly drafted nearby or proxy display-question unit with at least two independent source agencies, required by the workflow when source coverage is incomplete or no independent fallback can be found. This is a question proposal, not term definitions; only pass it as selected_unit to define-terms after the user chooses it.",
    ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking the user whether the source hierarchy is " +
        "right or would like to change anything. When only one source is " +
        "supplied, explicitly ask whether to proceed with one source, use " +
        "another forecast specification question with at least two independent " +
        "sources, or provide a known fallback source. If primary coverage is " +
        "missing, state that gap and offer the nearby/proxy alternative.",
    ),
};

export const resolutionCriteriaShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected forecast specification unit whose resolution criteria are being defined — same structure as a unit from submit_drafted_questions.",
  ),
  resolution_criteria: ResolutionCriteria.describe(
    "Broad source-grounded resolution criteria with one Yes/No rule for every binary question represented by the selected unit.",
  ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking whether the user agrees with the resolution criteria or would like anything changed.",
    ),
};

export const backgroundInformationShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: ConnectorDraftUnit.describe(
    "The selected forecast specification unit whose context and background information is being defined — same structure as a unit from submit_drafted_questions.",
  ),
  background_information: ForecastBackgroundInformation.describe(
    "Neutral, factual context and background information that helps the user understand the forecast without changing its question or resolution rules. Public references are optional.",
  ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking whether the user approves the context and background information or would like anything changed.",
    ),
};

export const selectedUnitShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode.describe(
    "The canonical BCP 47 language tag for this forecast specification. Keep it unchanged when continuing; use the target language only when explicitly starting a new specification.",
  ),
  start_new_specification: z
    .boolean()
    .optional()
    .describe(
      "Set true only when the user chooses to start a separate forecast specification branch, including a translated specification or a selected alternative. Omit forecast_specification_id in that case; the new record starts with no approvals and must receive fresh approval at every workflow stage.",
    ),
  unit_number: z
    .number()
    .int()
    .describe("The 1-based number of the unit selected from the draft."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact display-question unit selected from the prior draft or an alternative forecast specification handoff.",
  ),
};

const workflowOutput = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .extend({
      forecast_specification_id: ForecastSpecificationId,
      language_code: ForecastSpecificationLanguageCode,
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
export const selectedUnitOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    unit_number: selectedUnitShape.unit_number,
    selected_unit: selectedUnitShape.selected_unit,
  })
  .strict();

/** Client-visible MCP contract. Execution is provided by the private backend. */
export const foresightTools = {
  approve_forecast_specification: {
    title: "Approve Forecast Specification Stage",
    description:
      "Record an explicit user approval for one pending forecast specification " +
      "workflow stage. Call this only after the user has confirmed that " +
      "stage in chat; submit_* tools do not imply approval. Approve stages " +
      "in order: selected_unit, defined_terms, resolution_sources, " +
      "resolution_criteria, then background_information. On final " +
      "background_information approval, include language_code in structured " +
      "content but return only the forecast specification ID and exact question " +
      "text in the user-facing summary. The client should show those two items, then " +
      "offer to show the complete specification in chat, download it as YAML, " +
      "PDF, JSON, and/or Markdown, or do both. If the user chooses to see it, " +
      "call get_approved_forecast_specification with that ID, show the complete " +
      "result, and ask whether it looks correct. If it does, fulfill any chosen " +
      "downloads; if not, ask what should change, revise the affected stages, " +
      "and repeat the review. When both options are chosen, wait for correctness " +
      "confirmation before exporting. A direct-download choice does not require a read-through.",
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
      "Retrieve the approved selected unit, definitions, resolution source " +
      "records, resolution criteria, and background information saved during this chat; candidate drafts and workflow prompts " +
      "are not returned. The result includes the immutable language_code for " +
      "the specification. " +
      "Omit forecast_specification_id for the most recently updated forecast specification only in the " +
      "current MCP session, or provide the stable identifier returned by a " +
      "workflow tool for an explicit cross-session HTTP handoff.",
    inputSchema: approvedForecastSpecificationLookupShape,
    outputSchema: approvedForecastSpecificationRecallSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  download_approved_forecast_specification: {
    title: "Download Approved Forecast Specification",
    description:
      "Create deterministic downloads of one fully approved forecast " +
      "specification in the formats selected by the user. Use only the final " +
      "approved record and preserve its exact field values and stable section " +
      "order. For the same approved record and format, the file bytes must be " +
      "identical; do not add timestamps or model-generated rewrites. Use stable " +
      "filenames of the form forecast-specification-{forecast_specification_id}.yaml, " +
      ".pdf, .json, or .md. Return a named MCP resource_link and resource URI " +
      "per requested format so the client can present each file directly. A " +
      "browser-accessible HTTPS download URL may be included when the host " +
      "provides one; render it as an additional Markdown link labeled with its " +
      "filename. Call " +
      "after background_information is approved and the user chooses formats, " +
      "either directly or after a requested read-through is confirmed correct. " +
      "If both are requested, wait for that confirmation before exporting. Export " +
      "the identifier, language_code, selected unit, definitions, " +
      "resolution sources, resolution criteria, and background information; " +
      "exclude drafts and workflow prompts.",
    inputSchema: forecastSpecificationExportInputSchema.shape,
    outputSchema: forecastSpecificationExportOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  submit_defined_terms: {
    title: "Submit Defined Terms",
    description:
      "Validate and store a pending set of term definitions for the forecast " +
      "specification. Call this once after defining terms, passing the definitions as a " +
      "term-to-definition map. When the unit came from an alternative forecast specification " +
      "branch, define its terms from scratch and keep its supplied unit number. " +
      "Write definitions and the follow-up in the specification's immutable " +
      "language_code; the returned structured content includes that code. " +
      "Carry forecast_specification_id from the prior workflow result when continuing a record. " +
      "Submit and explicitly approve the selected unit first. This submission " +
      "does not imply user approval; call approve_forecast_specification after the user " +
      "agrees to the definitions.",
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
      "Validate and store a drafted set of display questions, " +
      "organized into binary/scalar/categorical/template units. Call this once " +
      "after the model has drafted questions for a new event, passing " +
      "the draft as structured units and a canonical BCP 47 language_code " +
      "chosen from the first user request or an explicit language choice. " +
      "The code is immutable for the record; write every question and follow-up " +
      "in that language. A forecast_specification_id is returned for later " +
      "workflow steps; use template placeholders only for narrow, closed values " +
      "that preserve one shared settlement source and method across every allowed combination. " +
      "Carry it explicitly when a later HTTP call may use a " +
      "new MCP session.",
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
      "Validate and store the detailed Resolution Source Hierarchy for a " +
      "forecast specification unit. " +
      "By default pass a rank-1 primary and a rank-2 fallback in the ranked " +
      "array. A user-requested single rank-1 source is valid but emits a " +
      "warning that asks whether to proceed with one source, switch to an " +
      "alternative forecast specification with at least two independent " +
      "sources, or provide a known fallback source. Call this once after definitions are approved, " +
      "carrying the forecast_specification_id from the definitions result. " +
      "Write source descriptions, coverage gaps, and the follow-up in the specification's immutable " +
      "language_code; the structured result returns that code. For a template, " +
      "verify that one identical hierarchy covers every allowed value; do not use value-specific sources. This submission " +
      "does not imply approval of the detailed sources; call " +
      "approve_forecast_specification after the user agrees to them.",
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
      "Validate and store broad source-grounded Resolution Criteria for every " +
      "binary question represented by a forecast specification unit. Call this once after resolution sources " +
      "are approved, carrying the forecast_specification_id from the source " +
      "result and preserving the exact selected unit, including every template " +
      "variable and allowed value. Write criteria and the follow-up in the " +
      "specification's immutable language_code; the structured result returns " +
      "that code. A template's one rule must apply uniformly to all substitutions using the same source, formula, procedure, and methodology; if any value needs different treatment, return to drafting and split the unit. The submission does not imply user approval; " +
      "call approve_forecast_specification with stage resolution_criteria after " +
      "the user agrees to the criteria, then continue to the background-information " +
      "stage. If validation fails, correct only the " +
      "reported field, retry with all other values unchanged, and show the user " +
      "only the corrected field and value instead of the full criteria.",
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
      "Validate and store neutral, factual context and background " +
      "information for a forecast specification. Call this once after resolution " +
      "criteria are approved, carrying the forecast_specification_id and exact " +
      "selected unit. Write context and the follow-up in the specification's " +
      "immutable language_code; the structured result returns that code. Optional background references are explanatory and do not alter the " +
      "approved resolution-source hierarchy. The submission does not imply user " +
      "approval; call approve_forecast_specification with stage " +
      "background_information after the user agrees. That final approval includes " +
      "language_code in structured content and shows only the forecast specification ID and question, then offer to show the " +
      "complete specification in chat, download it as YAML, PDF, JSON, and/or " +
      "Markdown, or do both.",
    inputSchema: backgroundInformationShape,
    outputSchema: backgroundInformationOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
  submit_selected_unit: {
    title: "Submit Selected Unit",
    description:
      "Validate and store the user's selected display-question unit as a " +
      "pending workflow stage. This submission does not imply approval. " +
      "Carry the existing language_code unchanged. Only when the user chooses " +
      "a separate specification branch (including a translation branch), set " +
      "start_new_specification=true, " +
      "omit forecast_specification_id, and pass the target language_code. " +
      "This creates a new record with no approvals; translate only outputs from " +
      "stages already approved, then obtain fresh approval for every stage in " +
      "order. " +
      "After the user confirms the selected unit in chat, call " +
      "approve_forecast_specification with stage selected_unit before approving " +
      "definitions or continuing the workflow.",
    inputSchema: selectedUnitShape,
    outputSchema: selectedUnitOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
} as const;

export type ForesightToolName = keyof typeof foresightTools;
