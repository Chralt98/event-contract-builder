import { CompletionCommand, CompletionOutput } from "./completion";
import { z } from "zod";
import {
  WorkspaceCommand,
  WorkspaceCommandResult,
  QuestionWorkspaceSnapshot,
  WorkspaceSnapshot,
  ContentWorkspaceSnapshot,
  WorkspaceRevision,
  workspaceRevisionBindingShape,
} from "./workspace";
import { Definitions } from "./display-question";
import { SourceHierarchy } from "./resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { ResolutionCriteria } from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";
import { ForecastNewsTimeline } from "./news-timeline";
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
    "Canonical complete Markdown fallback review. Choose the presentation surface using the server instructions.",
  );

export const approvalOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    unit_number: z.number().int(),
    selected_unit: ConnectorDraftUnit,
    workspace: WorkspaceSnapshot.optional(),
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
  ...workspaceRevisionBindingShape,
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
    .min(1)
    .max(
      5,
      "A draft may contain one main question and up to four nearby ideas.",
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
      "One main draft first, followed by up to four distinct nearby proxy ideas.",
    ),
  followUp: z
    .string()
    .describe(
      "Ask which unit to use or revise, noting that term definition comes next.",
    ),
};

export const resolutionSourceShape = {
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit being sourced.",
  ),
  sources: SourceHierarchy.describe(
    "Ranked hierarchy for the forecast outcome; prefer an independent primary and fallback.",
  ),
  condition_sources: SourceHierarchy.optional().describe(
    "Separate ranked hierarchy for the selected unit's condition.",
  ),
  followUp: z
    .string()
    .describe("Ask whether to approve or revise the source hierarchy."),
};

export const resolutionCriteriaShape = {
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The selected unit's 1-based draft number."),
  selected_unit: ConnectorDraftUnit.describe(
    "The exact approved unit receiving criteria.",
  ),
  resolution_criteria: ResolutionCriteria.describe(
    "One complete source-grounded Resolution Criteria text covering outcome rules, all approved resolution sources, the resolution method, and relevant exceptions or unresolved outcomes for the exact selected unit.",
  ),
  followUp: z
    .string()
    .describe("Ask whether the criteria are approved or need changes."),
};

export const backgroundInformationShape = {
  ...workspaceRevisionBindingShape,
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
  ...workspaceRevisionBindingShape,
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
  workspace: ContentWorkspaceSnapshot,
});
export const resolutionSourceOutputSchema = workflowOutput({
  ...resolutionSourceShape,
  workspace: ContentWorkspaceSnapshot,
});
export const resolutionCriteriaOutputSchema = workflowOutput({
  ...resolutionCriteriaShape,
  workspace: ContentWorkspaceSnapshot,
});
export const backgroundInformationOutputSchema = workflowOutput({
  ...backgroundInformationShape,
  workspace: ContentWorkspaceSnapshot,
});
export const newsTimelineOutputSchema = workflowOutput({
  ...newsTimelineShape,
  workspace: ContentWorkspaceSnapshot,
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

const execute_completion_commandTool = {
  title: "Forecast Completion",
  description:
    "Review completion or display approved exports of the current saved specification. Exporting saves that approved revision as complete.",
  inputSchema: CompletionCommand,
  outputSchema: CompletionOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

/** Client-visible MCP contract. Execution is provided by the private backend. */
const create_question_workspaceTool = {
  title: "Create Question Workspace",
  description:
    "Start an empty resumable question draft with an immutable language for manual entry. The draft cannot be approved until it contains a valid question.",
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
} as const;

const execute_workspace_commandTool = {
  title: "Workspace Command",
  description:
    "Reopen or execute a revision-bound command for any workflow stage. Edits and proposal application do not approve content.",
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
} as const;

const get_forecast_stage_reviewTool = {
  title: "Get Forecast Stage Review",
  description:
    "Open any workflow stage with its current approval bindings. Opening an untouched editable stage saves an incomplete draft without approval.",
  inputSchema: {
    forecast_specification_id: ForecastSpecificationId,
    stage: approvalStageSchema,
  },
  outputSchema: z.strictObject({
    forecast_specification_id: ForecastSpecificationId,
    stage: approvalStageSchema,
    workspace: WorkspaceSnapshot.optional(),
    ...workspaceRevisionBindingShape,
    review_markdown: ReviewMarkdown,
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const approve_forecast_specificationTool = {
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
} as const;

const get_approved_forecast_specificationTool = {
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
} as const;

const delete_forecast_specificationTool = {
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
} as const;

const get_plugin_feedback_stepTool = {
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
} as const;

const submit_plugin_feedbackTool = {
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
} as const;

const delete_plugin_feedbackTool = {
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
} as const;

const submit_defined_termsTool = {
  title: "Submit Defined Terms",
  description:
    "Validate and submit a complete definition map for an approved selected unit. Fills an untouched stage or stores a revision-bound proposal for an existing draft.",
  inputSchema: definedTermsShape,
  outputSchema: definedTermsOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_drafted_questionsTool = {
  title: "Submit Drafted Questions",
  description:
    "Validate and store forecast questions, including optional prerequisite conditions. Starts a new record when no ID is supplied, or stores a proposal when editing an existing draft.",
  inputSchema: draftedQuestionsShape,
  outputSchema: draftedQuestionsOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_resolution_sourceTool = {
  title: "Resolution Source Hierarchy",
  description:
    "Validate and submit complete source hierarchies after definitions are approved. Fills an untouched stage or stores a revision-bound proposal for an existing draft.",
  inputSchema: resolutionSourceShape,
  outputSchema: resolutionSourceOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_resolution_criteriaTool = {
  title: "Resolution Criteria",
  description:
    "Validate and store one complete source-grounded Resolution Criteria text after source approval.",
  inputSchema: resolutionCriteriaShape,
  outputSchema: resolutionCriteriaOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_background_informationTool = {
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
} as const;

const submit_news_timelineTool = {
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
} as const;

const submit_selected_unitTool = {
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
} as const;

export const foresightTools: {
  readonly create_question_workspace: typeof create_question_workspaceTool;
  readonly execute_workspace_command: typeof execute_workspace_commandTool;
  readonly get_forecast_stage_review: typeof get_forecast_stage_reviewTool;
  readonly approve_forecast_specification: typeof approve_forecast_specificationTool;
  readonly get_approved_forecast_specification: typeof get_approved_forecast_specificationTool;
  readonly execute_completion_command: typeof execute_completion_commandTool;
  readonly delete_forecast_specification: typeof delete_forecast_specificationTool;
  readonly get_plugin_feedback_step: typeof get_plugin_feedback_stepTool;
  readonly submit_plugin_feedback: typeof submit_plugin_feedbackTool;
  readonly delete_plugin_feedback: typeof delete_plugin_feedbackTool;
  readonly submit_defined_terms: typeof submit_defined_termsTool;
  readonly submit_drafted_questions: typeof submit_drafted_questionsTool;
  readonly submit_resolution_source: typeof submit_resolution_sourceTool;
  readonly submit_resolution_criteria: typeof submit_resolution_criteriaTool;
  readonly submit_background_information: typeof submit_background_informationTool;
  readonly submit_news_timeline: typeof submit_news_timelineTool;
  readonly submit_selected_unit: typeof submit_selected_unitTool;
} = {
  create_question_workspace: create_question_workspaceTool,
  execute_workspace_command: execute_workspace_commandTool,
  get_forecast_stage_review: get_forecast_stage_reviewTool,
  approve_forecast_specification: approve_forecast_specificationTool,
  get_approved_forecast_specification: get_approved_forecast_specificationTool,
  execute_completion_command: execute_completion_commandTool,
  delete_forecast_specification: delete_forecast_specificationTool,
  get_plugin_feedback_step: get_plugin_feedback_stepTool,
  submit_plugin_feedback: submit_plugin_feedbackTool,
  delete_plugin_feedback: delete_plugin_feedbackTool,
  submit_defined_terms: submit_defined_termsTool,
  submit_drafted_questions: submit_drafted_questionsTool,
  submit_resolution_source: submit_resolution_sourceTool,
  submit_resolution_criteria: submit_resolution_criteriaTool,
  submit_background_information: submit_background_informationTool,
  submit_news_timeline: submit_news_timelineTool,
  submit_selected_unit: submit_selected_unitTool,
};

export type ForesightToolName = keyof typeof foresightTools;
