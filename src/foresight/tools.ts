import { z } from "zod";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { alternativeForecastSpecificationSchema } from "./source-alternative";
import {
  sourceHierarchyRankError,
  sourceIndependenceError,
} from "./source-validation";
import {
  optionalForecastSpecificationId,
  approvalStageSchema,
  approvedForecastSpecificationRecallSchema,
} from "./workflow";

export const approvalShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  stage: approvalStageSchema.describe(
    "The pending workflow stage the user explicitly approved in chat.",
  ),
};

export const approvalOutputSchema =
  approvedForecastSpecificationRecallSchema.extend({
    approved_stage: approvalStageSchema,
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
        "or an additional placeholder-bearing template with its allowed values. " +
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

export const selectedUnitShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The 1-based number of the unit selected from the draft."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact display-question unit selected from the prior draft or an alternative forecast specification handoff.",
  ),
};

/** Client-visible MCP contract. Execution is provided by the private backend. */
export const foresightTools = {
  approve_forecast_specification: {
    title: "Approve Forecast Specification Stage",
    description:
      "Record an explicit user approval for one pending forecast specification " +
      "workflow stage. Call this only after the user has confirmed that " +
      "stage in chat; submit_* tools do not imply approval. Approve stages " +
      "in order: selected_unit, defined_terms, resolution_sources, then " +
      "resolution_criteria.",
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
      "records, and resolution criteria saved during this chat; candidate drafts and workflow prompts " +
      "are not returned. " +
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
  submit_defined_terms: {
    title: "Submit Defined Terms",
    description:
      "Validate and store a pending set of term definitions for the forecast " +
      "specification. Call this once after defining terms, passing the definitions as a " +
      "term-to-definition map. When the unit came from an alternative forecast specification " +
      "branch, define its terms from scratch and keep its supplied unit number. " +
      "Carry forecast_specification_id from the prior workflow result when continuing a record. " +
      "Submit and explicitly approve the selected unit first. This submission " +
      "does not imply user approval; call approve_forecast_specification after the user " +
      "agrees to the definitions.",
    inputSchema: definedTermsShape,
    outputSchema: definedTermsShape,
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
      "the draft as structured units. A forecast_specification_id is returned for later " +
      "workflow steps; carry it explicitly when a later HTTP call may use a " +
      "new MCP session.",
    inputSchema: draftedQuestionsShape,
    outputSchema: draftedQuestionsShape,
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
      "carrying the forecast_specification_id from the definitions result. This submission " +
      "does not imply approval of the detailed sources; call " +
      "approve_forecast_specification after the user agrees to them.",
    inputSchema: resolutionSourceShape,
    outputSchema: resolutionSourceShape,
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
      "variable and allowed value. The submission does not imply user approval; " +
      "call approve_forecast_specification with stage resolution_criteria after " +
      "the user agrees to the criteria. If validation fails, correct only the " +
      "reported field, retry with all other values unchanged, and show the user " +
      "only the corrected field and value instead of the full criteria.",
    inputSchema: resolutionCriteriaShape,
    outputSchema: resolutionCriteriaShape,
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
      "After the user confirms the selected unit in chat, call " +
      "approve_forecast_specification with stage selected_unit before approving " +
      "definitions or continuing the workflow.",
    inputSchema: selectedUnitShape,
    outputSchema: selectedUnitShape,
    annotations: {
      readOnlyHint: false,
      idempotentHint: true,
    },
  },
} as const;

export type ForesightToolName = keyof typeof foresightTools;
