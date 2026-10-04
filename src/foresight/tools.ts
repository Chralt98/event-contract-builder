import { z } from "zod";
import {
  WorkspaceCommand,
  WorkspaceCommandResult,
  QuestionWorkspaceSnapshot,
  WorkspaceRevision,
  workspaceRevisionBindingShape,
} from "./workspace";
import { Definitions } from "./display-question";
import { DataSource } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";
import { ForecastNewsTimeline } from "./news-timeline";
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
  ...workspaceRevisionBindingShape,
  forecast_specification_id: ForecastSpecificationId.describe(
    "ID returned by the prior workflow step; required to identify the record being approved.",
  ),
  stage: approvalStageSchema.describe(
    "The pending stage whose exact revision the user explicitly approved.",
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
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    unit_number: z.number().int(),
    selected_unit: ConnectorDraftUnit,
    workspace: QuestionWorkspaceSnapshot.optional(),
    approved_stage: approvalStageSchema,
    ...workspaceRevisionBindingShape,
    review_markdown: ReviewMarkdown,
  })
  .strict();

export const approvedForecastSpecificationLookupShape = {
  forecast_specification_id: optionalForecastSpecificationId,
};

export const deleteForecastSpecificationShape = {
  forecast_specification_id: ForecastSpecificationId.describe(
    "The exact forecast specification record the user explicitly asked to delete.",
  ),
};

export const deleteForecastSpecificationOutputSchema = z
  .object({ deleted: z.literal(true) })
  .strict();

export const pluginFeedbackStepShape = {
  step: z
    .enum(["channels", "private_notice"])
    .describe("The feedback prompt to render."),
};
export type PluginFeedbackStep = z.infer<typeof pluginFeedbackStepShape.step>;

export const pluginFeedbackStepOutputSchema = z
  .object({
    step: pluginFeedbackStepShape.step,
    review_markdown: ReviewMarkdown,
  })
  .strict();

export const submitPluginFeedbackShape = {
  feedback: z
    .string()
    .trim()
    .min(1, "Feedback cannot be empty.")
    .max(4000, "Feedback must be 4,000 characters or fewer.")
    .describe("Feedback text the user explicitly chose to send."),
};

export const submitPluginFeedbackOutputSchema = z
  .object({
    feedback_id: z.string().uuid(),
    expires_at: z.string().datetime(),
  })
  .strict();

export const deletePluginFeedbackShape = {
  feedback_id: z
    .string()
    .uuid()
    .describe("The feedback receipt returned by submit_plugin_feedback."),
};

export const deletePluginFeedbackOutputSchema = z
  .object({ request_processed: z.literal(true) })
  .strict();

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
  expected_revision: WorkspaceRevision.optional().describe(
    "Required when proposing changes to an existing workspace; reopen before generating.",
  ),
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
      const signatures = units.map(({ question, variables, condition }) =>
        JSON.stringify({ question, variables: variables ?? [], condition }),
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

const sourceHierarchy = z
  .array(DataSource)
  .min(1, "At least one rank-1 primary source is required.")
  .superRefine((sources, ctx) => {
    const rankError = sourceHierarchyRankError(sources);
    if (rankError) ctx.addIssue({ code: "custom", message: rankError });
    const independenceError = sourceIndependenceError(sources);
    if (independenceError) {
      ctx.addIssue({ code: "custom", message: independenceError });
    }
  });

export const resolutionSourceShape = {
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit being sourced.",
  ),
  sources: sourceHierarchy.describe(
    "Ranked hierarchy for the forecast outcome; prefer an independent primary and fallback.",
  ),
  condition_sources: sourceHierarchy
    .optional()
    .describe("Separate ranked hierarchy for the selected unit's condition."),
  followUp: z
    .string()
    .describe("Ask whether to approve or revise the source hierarchy."),
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
    "Source-grounded criteria for the selected outcome and its condition, when present, covering every declared value and combination.",
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
  background_information: ForecastBackgroundInformation,
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
  expected_revision: WorkspaceRevision.optional().describe(
    "Required when selecting or editing an existing workspace; submission does not approve.",
  ),
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
      ...workspaceRevisionBindingShape,
    })
    .strict();

export const draftedQuestionsOutputSchema = workflowOutput({
  ...draftedQuestionsShape,
  workspace: QuestionWorkspaceSnapshot,
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
    ...workspaceRevisionBindingShape,
    workspace: QuestionWorkspaceSnapshot,
    unit_number: selectedUnitShape.unit_number,
    selected_unit: selectedUnitShape.selected_unit,
    review_markdown: ReviewMarkdown,
  })
  .strict();

/** Client-visible MCP contract. Execution is provided by the private backend. */
export const foresightTools = {
  create_question_workspace: {
    title: "Create Question Workspace",
    description:
      "Start an empty resumable question draft with an immutable language. Saving and approving are separate operations.",
    inputSchema: { language_code: ForecastSpecificationLanguageCode },
    outputSchema: z.strictObject({
      workspace: QuestionWorkspaceSnapshot,
      review_markdown: ReviewMarkdown,
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  execute_workspace_command: {
    title: "Question Workspace Command",
    description:
      "Reopen or execute a revision-bound question command through the shared workspace engine. Returns canonical review, validation, recovery, or Continue intent for core and app clients.",
    inputSchema: WorkspaceCommand,
    outputSchema: z.strictObject({
      result: WorkspaceCommandResult,
      review_markdown: ReviewMarkdown,
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  get_forecast_stage_review: {
    title: "Get Forecast Stage Review",
    description:
      "Retrieve a saved pending stage and its current approval bindings for review or stale-approval recovery. Does not approve content.",
    inputSchema: {
      forecast_specification_id: ForecastSpecificationId,
      stage: approvalStageSchema,
    },
    outputSchema: z.strictObject({
      forecast_specification_id: ForecastSpecificationId,
      stage: approvalStageSchema,
      ...workspaceRevisionBindingShape,
      review_markdown: ReviewMarkdown,
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  approve_forecast_specification: {
    title: "Approve Forecast Specification Stage",
    description:
      "Approve one pending workflow stage after the user explicitly accepts its rendered review. Requires the exact revision and prerequisite bindings from its canonical review.",
    inputSchema: approvalShape,
    outputSchema: approvalOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
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
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  delete_forecast_specification: {
    title: "Delete Forecast Specification",
    description:
      "Immediately and permanently delete one stored Forecast Specification. Call only when the user explicitly asks to delete it and supplies its forecast specification ID.",
    inputSchema: deleteForecastSpecificationShape,
    outputSchema: deleteForecastSpecificationOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  get_plugin_feedback_step: {
    title: "Get Plugin Feedback Step",
    description:
      "Return canonical Markdown for the feedback channel menu or private-submission privacy notice. Call after the user chooses feedback or the private channel.",
    inputSchema: pluginFeedbackStepShape,
    outputSchema: pluginFeedbackStepOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_plugin_feedback: {
    title: "Submit Plugin Feedback",
    description:
      "Store feedback the user explicitly chose to submit about Bleavit Foresight. Stores only the submitted text and a deletion receipt for 180 days.",
    inputSchema: submitPluginFeedbackShape,
    outputSchema: submitPluginFeedbackOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  delete_plugin_feedback: {
    title: "Delete Plugin Feedback",
    description:
      "Immediately delete one private feedback submission. Call only when the user explicitly asks and supplies its feedback receipt.",
    inputSchema: deletePluginFeedbackShape,
    outputSchema: deletePluginFeedbackOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
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
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_drafted_questions: {
    title: "Submit Drafted Questions",
    description:
      "Validate, store, and render selectable forecast units, including optional prerequisite conditions. This starts a record with an immutable specification language.",
    inputSchema: draftedQuestionsShape,
    outputSchema: draftedQuestionsOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_resolution_source: {
    title: "Resolution Source Hierarchy",
    description:
      "Validate and render pending source hierarchies after definitions are approved, including a separate condition hierarchy for conditional units.",
    inputSchema: resolutionSourceShape,
    outputSchema: resolutionSourceOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_resolution_criteria: {
    title: "Resolution Criteria",
    description:
      "Validate and store source-grounded outcome criteria and, for conditional units, prerequisite criteria after source approval.",
    inputSchema: resolutionCriteriaShape,
    outputSchema: resolutionCriteriaOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_background_information: {
    title: "Context and Background Information",
    description:
      "Validate, store, and render pending neutral background information after criteria approval.",
    inputSchema: backgroundInformationShape,
    outputSchema: backgroundInformationOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
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
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  submit_selected_unit: {
    title: "Submit Selected Unit",
    description:
      "Save a selected unit as an unapproved working draft using its current workspace revision. Explicit approval is a separate command.",
    inputSchema: selectedUnitShape,
    outputSchema: selectedUnitOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
} as const;

export type ForesightToolName = keyof typeof foresightTools;
