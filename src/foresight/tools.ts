import { workspaceAccessTools } from "./workspace-access";
import { PreparationReceipt, StagePreparation } from "./stage-preparation";
import {
  CompletionCommand,
  CompletionOutput,
  ReopenCompletionCommand,
  ExportCompletionCommand,
} from "./completion";
import { z } from "zod";
import {
  ContinueForecastCommand,
  SetForecastNewsChoiceCommand,
  SetForecastNewsChoiceResult,
  QuestionWorkspaceSnapshot,
  WorkspaceSnapshot,
  WorkspaceRevision,
  workspaceRevisionBindingShape,
  workspacePayloadLimitBytes,
  WorkspaceDraft,
  editableWorkspaceStages,
} from "./workspace";
import {
  optionalForecastSpecificationId,
  ForecastSpecificationId,
  ForecastSpecificationLanguageCode,
  approvalStageSchema,
  approvedForecastSpecificationRecallSchema,
} from "./workflow";

const chatWorkspaceMutationShape = {
  forecast_specification_id: ForecastSpecificationId,
  ...workspaceRevisionBindingShape,
  stage: editableWorkspaceStages,
};

function boundedWorkspaceToolInput<T extends z.ZodType>(schema: T) {
  return schema.superRefine((value, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(value)).byteLength >
      workspacePayloadLimitBytes
    )
      ctx.addIssue({
        code: "custom",
        message: `Workspace payload exceeds ${workspacePayloadLimitBytes / 1024} KiB.`,
      });
  });
}

function addDraftStageIssue(
  value: { stage: string; draft?: z.infer<typeof WorkspaceDraft> },
  ctx: z.RefinementCtx,
) {
  if (!value.draft) return;
  const draftStage =
    "stage" in value.draft ? value.draft.stage : "forecast_question_unit";
  if (draftStage !== value.stage)
    ctx.addIssue({
      code: "custom",
      path: ["draft"],
      message: "Draft must match the selected stage.",
    });
}

export const proposeForecastStageChangesShape = boundedWorkspaceToolInput(
  z
    .strictObject({
      ...chatWorkspaceMutationShape,
      preparation_receipt: PreparationReceipt,
      draft: WorkspaceDraft,
      rationale: z.string().trim().min(1).max(1000).optional(),
    })
    .superRefine(addDraftStageIssue),
);

export const forecastStageProposalShape = z.strictObject({
  ...chatWorkspaceMutationShape,
  proposal_id: z.uuid(),
});

export const revalidateUnchangedForecastStagesShape = z
  .strictObject({
    forecast_specification_id: ForecastSpecificationId,
    stages: z
      .array(
        z.enum([
          "defined_terms",
          "resolution_sources",
          "resolution_criteria",
          "background_information",
          "news_timeline",
        ]),
      )
      .min(1)
      .max(5),
    rationale: z.string().trim().min(1).max(1000),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.stages).size !== value.stages.length)
      ctx.addIssue({
        code: "custom",
        path: ["stages"],
        message: "Each stage may be listed only once.",
      });
  });

export const revalidateUnchangedForecastStagesOutputSchema = z.strictObject({
  forecast_specification_id: ForecastSpecificationId,
  results: z.array(
    z.strictObject({
      stage: z.enum([
        "defined_terms",
        "resolution_sources",
        "resolution_criteria",
        "background_information",
        "news_timeline",
      ]),
      status: z.enum(["revalidated", "skipped", "failed"]),
      message: z.string().optional(),
    }),
  ),
});

export const impactReviewOfferSchema = z.strictObject({
  approved_stage: approvalStageSchema,
  approved_revision: WorkspaceRevision,
  status: z.enum(["pending", "accepted"]),
  review_stages: z.array(approvalStageSchema),
  stages_with_existing_proposals: z.array(approvalStageSchema),
});

const workspaceActionOutputSchema = z.strictObject({
  result: z
    .object({
      status: z.enum([
        "already_processed",
        "snapshot",
        "saved",
        "conflict",
        "invalid",
        "failed",
        "continue_intent",
      ]),
    })
    .passthrough()
    .describe(
      "Workspace action result. Reopen the stage review for the full updated snapshot.",
    ),
  impact_review: impactReviewOfferSchema.optional(),
});

export const impactReviewDecisionShape = {
  forecast_specification_id: ForecastSpecificationId,
  approved_revision: WorkspaceRevision.describe(
    "The approved revision whose impact review the user explicitly requested or declined.",
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

const prepare_forecast_specification_stageTool = {
  title: "Prepare Forecast Specification Stage",
  description:
    "Load the guidance and references required to work on a forecast specification stage. Use before analyzing or drafting a stage. Returns a receipt required by certain stage actions; does not create or change the specification.",
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
    "Create an empty question draft in the local in-memory adapter. Hosted clients use create_forecast_specification.",
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

const propose_forecast_specification_stage_changesTool = {
  title: "Propose Forecast Specification Stage Changes",
  description:
    "Propose complete content for any forecast specification stage, including the first Question, without changing approved content. Requires current preparation and revision bindings; review the proposal in chat before exact approval.",
  inputSchema: proposeForecastStageChangesShape,
  outputSchema: workspaceActionOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

const approve_forecast_specification_stage_proposalTool = {
  title: "Approve Forecast Specification Stage Proposal",
  description:
    "Approve a forecast specification stage proposal. Use when the user explicitly approves the exact proposal as the stage’s final content. Applies the proposal to the active draft and approves the stage in one operation. Requires the current proposal ID, revision bindings, and the complete approved draft copied verbatim from the current proposal, including row IDs. The server rejects any draft that differs from the stored proposal. Approval may trigger a whole-specification impact review.",
  inputSchema: forecastStageProposalShape.extend({
    approved_draft_json: z
      .string()
      .min(1)
      .max(64000)
      .describe(
        "Complete user-approved proposal draft as JSON, including row IDs.",
      ),
  }),
  outputSchema: workspaceActionOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

const discard_forecast_specification_stage_proposalTool = {
  title: "Discard Forecast Specification Stage Proposal",
  description:
    "Discard a pending proposal for a forecast specification stage. Use when the user explicitly declines the proposal or asks to remove it. Requires the proposal ID and current revision bindings. Removes the proposal without changing the active draft or the stage’s approval.",
  inputSchema: forecastStageProposalShape,
  outputSchema: workspaceActionOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

const revalidate_unchanged_forecast_specification_stagesTool = {
  title: "Revalidate Unchanged Forecast Specification Stages",
  description:
    "Revalidate one or more previously approved forecast specification stages against their current prerequisites. Use when the user explicitly asks to retain approval for stages whose saved content is unchanged. Requires a rationale and reports the result for each requested stage. Does not approve changed content.",
  inputSchema: revalidateUnchangedForecastStagesShape,
  outputSchema: revalidateUnchangedForecastStagesOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;

const continue_forecast_specificationTool = {
  title: "Continue Forecast Specification",
  description:
    "Continue from the approved revision after explicit confirmation. Copy expected_revision and prerequisite_revisions verbatim from the latest review; prerequisites list upstream stages only.",
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
    "Start or decline a whole-specification impact review only after the user explicitly requests it, then mark it complete after all eligible stages are reviewed.",
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

const get_forecast_specification_stage_reviewTool = {
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
    "Immediately and permanently delete the current workspace’s draft or archive. Call only after the user explicitly asks to delete that specification.",
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

const baseForesightTools: {
  readonly prepare_forecast_specification_stage: typeof prepare_forecast_specification_stageTool;
  readonly create_question_workspace: typeof create_question_workspaceTool;
  readonly propose_forecast_specification_stage_changes: typeof propose_forecast_specification_stage_changesTool;
  readonly approve_forecast_specification_stage_proposal: typeof approve_forecast_specification_stage_proposalTool;
  readonly discard_forecast_specification_stage_proposal: typeof discard_forecast_specification_stage_proposalTool;
  readonly revalidate_unchanged_forecast_specification_stages: typeof revalidate_unchanged_forecast_specification_stagesTool;
  readonly continue_forecast_specification: typeof continue_forecast_specificationTool;
  readonly set_forecast_news_choice: typeof set_forecast_news_choiceTool;
  readonly get_forecast_specification_stage_review: typeof get_forecast_specification_stage_reviewTool;
  readonly decide_forecast_impact_review: typeof decide_forecast_impact_reviewTool;
  readonly get_approved_forecast_specification: typeof get_approved_forecast_specificationTool;
  readonly execute_completion_command: typeof execute_completion_commandTool;
  readonly open_forecast_export: typeof open_forecast_exportTool;
  readonly export_forecast_specification: typeof export_forecast_specificationTool;
  readonly delete_forecast_specification: typeof delete_forecast_specificationTool;
  readonly get_plugin_feedback_step: typeof get_plugin_feedback_stepTool;
  readonly submit_plugin_feedback: typeof submit_plugin_feedbackTool;
  readonly delete_plugin_feedback: typeof delete_plugin_feedbackTool;
} = {
  prepare_forecast_specification_stage:
    prepare_forecast_specification_stageTool,
  create_question_workspace: create_question_workspaceTool,
  propose_forecast_specification_stage_changes:
    propose_forecast_specification_stage_changesTool,
  approve_forecast_specification_stage_proposal:
    approve_forecast_specification_stage_proposalTool,
  discard_forecast_specification_stage_proposal:
    discard_forecast_specification_stage_proposalTool,
  revalidate_unchanged_forecast_specification_stages:
    revalidate_unchanged_forecast_specification_stagesTool,
  continue_forecast_specification: continue_forecast_specificationTool,
  set_forecast_news_choice: set_forecast_news_choiceTool,
  get_forecast_specification_stage_review:
    get_forecast_specification_stage_reviewTool,
  decide_forecast_impact_review: decide_forecast_impact_reviewTool,
  get_approved_forecast_specification: get_approved_forecast_specificationTool,
  execute_completion_command: execute_completion_commandTool,
  open_forecast_export: open_forecast_exportTool,
  export_forecast_specification: export_forecast_specificationTool,
  delete_forecast_specification: delete_forecast_specificationTool,
  get_plugin_feedback_step: get_plugin_feedback_stepTool,
  submit_plugin_feedback: submit_plugin_feedbackTool,
  delete_plugin_feedback: delete_plugin_feedbackTool,
};

export const foresightTools: typeof baseForesightTools &
  typeof workspaceAccessTools = {
  ...baseForesightTools,
  ...workspaceAccessTools,
};

export type ForesightToolName = keyof typeof foresightTools;
