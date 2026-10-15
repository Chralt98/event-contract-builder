import { PreparationReceipt, StagePreparation } from "./stage-preparation";
import {
  CompletionCommand,
  CompletionOutput,
  ReopenCompletionCommand,
  ExportCompletionCommand,
} from "./completion";
import { z } from "zod";
import {
  WorkspaceCommand,
  AdvanceForecastCommand,
  ApproveAndContinueCommand,
  ContinueForecastCommand,
  WorkspaceCommandResult,
  SetForecastNewsChoiceCommand,
  SetForecastNewsChoiceResult,
  QuestionWorkspaceSnapshot,
  WorkspaceSnapshot,
  ContentWorkspaceSnapshot,
  WorkspaceRevision,
  workspaceRevisionBindingShape,
} from "./workspace";
import { Definitions } from "./display-question";
import { SourceHierarchy } from "./resolution";
import { ConnectorForecastQuestionUnit } from "./connector-forecast-question-unit";
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

export const impactReviewOfferSchema = z.strictObject({
  approved_stage: approvalStageSchema,
  approved_revision: WorkspaceRevision,
  status: z.enum(["pending", "accepted"]),
  review_stages: z.array(approvalStageSchema),
  stages_with_existing_proposals: z.array(approvalStageSchema),
});

export const approvalOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    unit_number: z.number().int(),
    forecast_question_unit: ConnectorForecastQuestionUnit,
    workspace: WorkspaceSnapshot.optional(),
    approved_stage: approvalStageSchema,
    impact_review: impactReviewOfferSchema.optional(),
    ...workspaceRevisionBindingShape,
  })
  .strict();

export const impactReviewDecisionShape = {
  forecast_specification_id: ForecastSpecificationId,
  approved_revision: WorkspaceRevision.describe(
    "The approved revision whose impact review the user accepted or declined.",
  ),
  decision: z.enum(["review", "decline", "complete"]),
};

export const impactReviewDecisionOutputSchema = z.strictObject({
  forecast_specification_id: ForecastSpecificationId,
  approved_stage: approvalStageSchema.optional(),
  approved_revision: WorkspaceRevision.optional(),
  status: z.enum([
    "pending",
    "accepted",
    "declined",
    "completed",
    "no_review_available",
  ]),
  review_stages: z.array(approvalStageSchema),
  stages_with_existing_proposals: z.array(approvalStageSchema),
});

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

const proposalRationaleShape = {
  rationale: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .optional()
    .describe(
      "For a proposal, provide the material changes and why they improve the draft so the assistant can explain the suggestion in chat. The App shows the concrete proposed values for review and copying.",
    ),
};

export const definedTermsShape = {
  preparation_receipt: PreparationReceipt,
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The forecast question unit's 1-based draft number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The exact approved forecast question unit being defined.",
  ),
  definitions: Definitions.describe(
    "Map from each ambiguous term to its precise, unambiguous definition.",
  ),
  ...proposalRationaleShape,
  followUp: z
    .string()
    .describe("Ask whether the definitions are approved or need changes."),
};

export const draftedQuestionsShape = {
  preparation_receipt: PreparationReceipt,
  expected_revision: WorkspaceRevision.optional().describe(
    "Required when proposing changes to an existing workspace; reopen before generating.",
  ),
  forecast_specification_id: optionalForecastSpecificationId,
  language_code: ForecastSpecificationLanguageCode.describe(
    "Immutable canonical BCP 47 language for this new record.",
  ),
  units: z
    .array(ConnectorForecastQuestionUnit)
    .min(1)
    .max(1)
    .describe(
      "Submit the one forecast question derived from the user's intent for the App draft. Mention useful nearby forecast questions conversationally in chat.",
    ),
  ...proposalRationaleShape,
  followUp: z
    .string()
    .describe(
      "Ask whether the proposed forecast question looks right. Add useful nearby forecast questions or brief context in chat without repeating details shown in the App.",
    ),
};

export const resolutionSourceShape = {
  preparation_receipt: PreparationReceipt,
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The forecast question unit's 1-based draft number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The exact approved forecast question unit being sourced.",
  ),
  sources: SourceHierarchy.describe(
    "Ranked hierarchy for the forecast outcome; prefer an independent primary and fallback.",
  ),
  condition_sources: SourceHierarchy.optional().describe(
    "Separate ranked hierarchy for the forecast question unit's condition.",
  ),
  ...proposalRationaleShape,
  followUp: z
    .string()
    .describe("Ask whether to approve or revise the source hierarchy."),
};

export const resolutionCriteriaShape = {
  preparation_receipt: PreparationReceipt,
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The forecast question unit's 1-based draft number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The exact approved forecast question unit receiving criteria.",
  ),
  resolution_criteria: ResolutionCriteria.describe(
    "One complete source-grounded Resolution Criteria text covering outcome rules, all approved resolution sources, the resolution method, and relevant exceptions or unresolved outcomes for the exact forecast question unit.",
  ),
  ...proposalRationaleShape,
  followUp: z
    .string()
    .describe("Ask whether the criteria are approved or need changes."),
};

export const backgroundInformationShape = {
  preparation_receipt: PreparationReceipt,
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The forecast question unit's 1-based draft number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The exact approved forecast question unit receiving background information.",
  ),
  ...proposalRationaleShape,
  background_information: ForecastBackgroundInformation,
  followUp: z
    .string()
    .describe("Ask whether the background is approved or needs changes."),
};

export const newsTimelineShape = {
  preparation_receipt: PreparationReceipt,
  ...workspaceRevisionBindingShape,
  forecast_specification_id: optionalForecastSpecificationId,
  unit_number: z
    .number()
    .int()
    .describe("The forecast question unit number, not a news-item number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The exact approved forecast question unit receiving optional news.",
  ),
  ...proposalRationaleShape,
  news_timeline: ForecastNewsTimeline.describe(
    "Incremental factual news in the user's chosen order; empty only for requested removal.",
  ),
  followUp: z
    .string()
    .describe("Ask which news-item numbers to keep or revise."),
};

export const forecastQuestionUnitShape = {
  preparation_receipt: PreparationReceipt,
  expected_revision: WorkspaceRevision.optional().describe(
    "Required when editing an existing workspace; submission does not approve.",
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
    .describe("The forecast question unit's 1-based draft number."),
  forecast_question_unit: ConnectorForecastQuestionUnit.describe(
    "The forecast question unit being submitted for review.",
  ),
};

const workflowOutput = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .extend({
      forecast_specification_id: ForecastSpecificationId,
      language_code: ForecastSpecificationLanguageCode,
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
export const forecastQuestionUnitOutputSchema = z
  .object({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    ...workspaceRevisionBindingShape,
    workspace: QuestionWorkspaceSnapshot,
    unit_number: forecastQuestionUnitShape.unit_number,
    forecast_question_unit: forecastQuestionUnitShape.forecast_question_unit,
  })
  .strict();

const prepare_stageTool = {
  title: "Prepare Forecast Stage",
  description:
    "Deliver the canonical shared instructions, active skill, and required references before stage analysis or drafting. Issues a reusable receipt without creating a record or opening the App.",
  inputSchema: {
    stage: approvalStageSchema,
    preparation_receipt: PreparationReceipt.optional(),
  },
  outputSchema: StagePreparation,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

const execute_completion_commandTool = {
  title: "Forecast Completion",
  description:
    "Load the App completion/export flow or generate approved YAML, JSON, and Markdown documents. Exporting saves that revision as complete.",
  inputSchema: CompletionCommand,
  outputSchema: CompletionOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

/** Client-visible MCP contract. Execution is provided by the private backend. */
const create_question_workspaceTool = {
  title: "Create Question Workspace",
  description:
    "Start an empty resumable question draft for manual entry. Check for an active draft first and get the user's choice before replacing it.",
  inputSchema: { language_code: ForecastSpecificationLanguageCode },
  outputSchema: z.strictObject({
    workspace: QuestionWorkspaceSnapshot,
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
    "Run one revision-bound App workspace command for navigation and App actions. For model-driven approval or continuation, use advance_forecast_specification so the App opens with the submitted next-stage draft.",
  inputSchema: WorkspaceCommand,
  outputSchema: z.strictObject({
    result: WorkspaceCommandResult,
    impact_review: impactReviewOfferSchema.optional(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const advance_forecast_specificationTool = {
  title: "Advance Forecast Specification",
  description:
    "Execute the enabled approve_and_continue or continue action from the current workspace. Returns the next-stage bindings without attaching or opening the App UI; submit the prepared next-stage content to open its populated review.",
  inputSchema: AdvanceForecastCommand,
  outputSchema: z.strictObject({
    result: WorkspaceCommandResult,
    preparation: StagePreparation.optional(),
    impact_review: impactReviewOfferSchema.optional(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const approve_and_continue_forecast_specificationTool = {
  title: "Approve and Continue Forecast Specification",
  description:
    "Approve the exact pending stage revision and continue to its next stage. Requires the user's explicit approval of that revision.",
  inputSchema: ApproveAndContinueCommand,
  outputSchema: z.strictObject({
    result: z.unknown(),
    preparation: StagePreparation.optional(),
    impact_review: impactReviewOfferSchema.optional(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const continue_forecast_specificationTool = {
  title: "Continue Forecast Specification",
  description:
    "Continue from an already approved stage to its next stage. Requires explicit approval of the exact approved revision.",
  inputSchema: ContinueForecastCommand,
  outputSchema: z.strictObject({
    result: z.unknown(),
    preparation: StagePreparation.optional(),
    impact_review: impactReviewOfferSchema.optional(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const open_forecast_exportTool = {
  title: "Open Forecast Export",
  description:
    "Open the Export view for one forecast specification so the user can review available formats.",
  inputSchema: ReopenCompletionCommand,
  outputSchema: CompletionOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const export_forecast_specificationTool = {
  title: "Export Forecast Specification",
  description:
    "Generate the selected formats for the exact approved revision. Exporting saves that revision as complete.",
  inputSchema: ExportCompletionCommand,
  outputSchema: CompletionOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const decide_forecast_impact_reviewTool = {
  title: "Record Forecast Impact Review Decision",
  description:
    "Record whether the user accepts or declines a whole-specification impact review offered after content-changing approval. Complete it after all eligible stages are reviewed.",
  inputSchema: impactReviewDecisionShape,
  outputSchema: impactReviewDecisionOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const set_forecast_news_choiceTool = {
  title: "Set Forecast News Choice",
  description:
    "Save the user's Skip, Research, or no-qualifying-news choice without opening the News App. Skip clears existing items from the editable draft; the approved timeline remains until its removal is approved.",
  inputSchema: SetForecastNewsChoiceCommand,
  outputSchema: z.strictObject({
    result: SetForecastNewsChoiceResult,
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
    "Fetch a saved workflow stage's structured workspace, revision, and prerequisite bindings. Initializes an untouched stage without approval; does not attach or open the MCP App UI.",
  inputSchema: {
    forecast_specification_id: ForecastSpecificationId,
    stage: approvalStageSchema,
    preparation_receipt: PreparationReceipt.optional(),
  },
  outputSchema: z.strictObject({
    forecast_specification_id: ForecastSpecificationId,
    stage: approvalStageSchema,
    workspace: WorkspaceSnapshot.optional(),
    preparation: StagePreparation.optional(),
    ...workspaceRevisionBindingShape,
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
    "Approve a stage without advancing. Use only when the user explicitly asks to stay; otherwise use approve_and_continue through advance_forecast_specification.",
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
    "Immediately and permanently delete the specified active draft or saved Forecast Specification by ID. Call only after the user explicitly asks to delete that record.",
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
    "Select which feedback step the MCP App should show after the user chooses feedback or private submission.",
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
    "Save generated definitions for the approved unit with a current stage preparation receipt. After an App edit, saves a proposal instead of replacing the draft.",
  inputSchema: definedTermsShape,
  outputSchema: definedTermsOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_drafted_questionTool = {
  title: "Submit Drafted Question",
  description:
    "Save a generated question with a current stage preparation receipt. Creates or updates a record; confirm any active draft's replacement first. After an App edit, saves a proposal.",
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
    "Save generated source hierarchies after definitions approval, with a current stage preparation receipt. After an App edit, saves a proposal instead of replacing the draft.",
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
    "Validate and store one complete source-grounded Resolution Criteria text after source approval. Requires the current stage preparation receipt.",
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
    "Validate, store, and render pending neutral background information after criteria approval. Requires the current stage preparation receipt.",
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
    "Save optional news after explicit opt-in and background approval, with a current stage preparation receipt. An empty timeline is only for requested removal of approved news.",
  inputSchema: newsTimelineShape,
  outputSchema: newsTimelineOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const submit_forecast_question_unitTool = {
  title: "Submit Forecast Question Unit",
  description:
    "Save a forecast question unit as an unapproved working draft using its current workspace revision. Explicit approval is a separate command. Requires the current stage preparation receipt.",
  inputSchema: forecastQuestionUnitShape,
  outputSchema: forecastQuestionUnitOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

export const foresightTools: {
  readonly prepare_stage: typeof prepare_stageTool;
  readonly create_question_workspace: typeof create_question_workspaceTool;
  readonly execute_workspace_command: typeof execute_workspace_commandTool;
  readonly advance_forecast_specification: typeof advance_forecast_specificationTool;
  readonly approve_and_continue_forecast_specification: typeof approve_and_continue_forecast_specificationTool;
  readonly continue_forecast_specification: typeof continue_forecast_specificationTool;
  readonly set_forecast_news_choice: typeof set_forecast_news_choiceTool;
  readonly get_forecast_stage_review: typeof get_forecast_stage_reviewTool;
  readonly decide_forecast_impact_review: typeof decide_forecast_impact_reviewTool;
  readonly approve_forecast_specification: typeof approve_forecast_specificationTool;
  readonly get_approved_forecast_specification: typeof get_approved_forecast_specificationTool;
  readonly execute_completion_command: typeof execute_completion_commandTool;
  readonly open_forecast_export: typeof open_forecast_exportTool;
  readonly export_forecast_specification: typeof export_forecast_specificationTool;
  readonly delete_forecast_specification: typeof delete_forecast_specificationTool;
  readonly get_plugin_feedback_step: typeof get_plugin_feedback_stepTool;
  readonly submit_plugin_feedback: typeof submit_plugin_feedbackTool;
  readonly delete_plugin_feedback: typeof delete_plugin_feedbackTool;
  readonly submit_defined_terms: typeof submit_defined_termsTool;
  readonly submit_drafted_question: typeof submit_drafted_questionTool;
  readonly submit_resolution_source: typeof submit_resolution_sourceTool;
  readonly submit_resolution_criteria: typeof submit_resolution_criteriaTool;
  readonly submit_background_information: typeof submit_background_informationTool;
  readonly submit_news_timeline: typeof submit_news_timelineTool;
  readonly submit_forecast_question_unit: typeof submit_forecast_question_unitTool;
} = {
  prepare_stage: prepare_stageTool,
  create_question_workspace: create_question_workspaceTool,
  execute_workspace_command: execute_workspace_commandTool,
  advance_forecast_specification: advance_forecast_specificationTool,
  approve_and_continue_forecast_specification:
    approve_and_continue_forecast_specificationTool,
  continue_forecast_specification: continue_forecast_specificationTool,
  set_forecast_news_choice: set_forecast_news_choiceTool,
  get_forecast_stage_review: get_forecast_stage_reviewTool,
  decide_forecast_impact_review: decide_forecast_impact_reviewTool,
  approve_forecast_specification: approve_forecast_specificationTool,
  get_approved_forecast_specification: get_approved_forecast_specificationTool,
  execute_completion_command: execute_completion_commandTool,
  open_forecast_export: open_forecast_exportTool,
  export_forecast_specification: export_forecast_specificationTool,
  delete_forecast_specification: delete_forecast_specificationTool,
  get_plugin_feedback_step: get_plugin_feedback_stepTool,
  submit_plugin_feedback: submit_plugin_feedbackTool,
  delete_plugin_feedback: delete_plugin_feedbackTool,
  submit_defined_terms: submit_defined_termsTool,
  submit_drafted_question: submit_drafted_questionTool,
  submit_resolution_source: submit_resolution_sourceTool,
  submit_resolution_criteria: submit_resolution_criteriaTool,
  submit_background_information: submit_background_informationTool,
  submit_news_timeline: submit_news_timelineTool,
  submit_forecast_question_unit: submit_forecast_question_unitTool,
};

export type ForesightToolName = keyof typeof foresightTools;
