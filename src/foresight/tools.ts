import { workspaceAccessTools } from "./workspace-access";
import { PreparationReceipt, StagePreparation } from "./stage-preparation";
import { CompletionOutput, ExportCompletionCommand } from "./completion";
import { z } from "zod";
import {
  ContinueForecastInput,
  SetForecastNewsChoiceCommand,
  SetForecastNewsChoiceResult,
  WorkspaceSnapshot,
  WorkspaceRevision,
  workspaceRevisionBindingShape,
  workspacePayloadLimitBytes,
  WorkspaceDraft,
  editableWorkspaceStages,
} from "./workspace";
import { ForecastSpecificationId, approvalStageSchema } from "./workflow";

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

const propose_forecast_specification_stage_changesTool = {
  title: "Propose Forecast Specification Stage Changes",
  description:
    "Propose complete content for a forecast specification stage. Use when the user wants to review proposed content in chat before approving the stage. Requires current preparation and revision bindings.",
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
    "Continue from the approved revision. Use when the user explicitly confirms they want to proceed. Requires the latest revision and prerequisite bindings; prerequisites list upstream stages only.",
  inputSchema: ContinueForecastInput,
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

const generate_forecast_specification_exportsTool = {
  title: "Generate Forecast Specification Exports",
  description:
    "Generate exports of the approved forecast specification. Use when the user selects export formats. Saves the approved revision as complete.",
  inputSchema: ExportCompletionCommand,
  outputSchema: CompletionOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const start_forecast_specification_impact_reviewTool = {
  title: "Start Forecast Specification Impact Review",
  description:
    "Record the status of a whole-specification impact review. Use when the user explicitly requests or declines a review, or when all eligible stages have been reviewed and the review is complete.",
  inputSchema: impactReviewDecisionShape,
  outputSchema: impactReviewDecisionOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;

const set_forecast_specification_news_choiceTool = {
  title: "Set Forecast Specification News Choice",
  description:
    "Record the user's choice about optional news. Use when the user chooses to skip news, research news, or no qualifying news was found. This does not remove an approved timeline.",
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
  title: "Get Forecast Specification Stage Review",
  description:
    "Fetch a forecast specification stage's workspace and revision bindings. Use when current stage content or bindings are needed for a proposal or conflict resolution. Initializes an untouched stage without approval; does not attach or open the MCP App UI.",
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
    "Store feedback about Bleavit Foresight. Use when the user explicitly chooses to submit feedback. Stores only the submitted text and a deletion receipt for 180 days.",
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
  readonly propose_forecast_specification_stage_changes: typeof propose_forecast_specification_stage_changesTool;
  readonly approve_forecast_specification_stage_proposal: typeof approve_forecast_specification_stage_proposalTool;
  readonly discard_forecast_specification_stage_proposal: typeof discard_forecast_specification_stage_proposalTool;
  readonly revalidate_unchanged_forecast_specification_stages: typeof revalidate_unchanged_forecast_specification_stagesTool;
  readonly continue_forecast_specification: typeof continue_forecast_specificationTool;
  readonly set_forecast_specification_news_choice: typeof set_forecast_specification_news_choiceTool;
  readonly get_forecast_specification_stage_review: typeof get_forecast_specification_stage_reviewTool;
  readonly start_forecast_specification_impact_review: typeof start_forecast_specification_impact_reviewTool;
  readonly generate_forecast_specification_exports: typeof generate_forecast_specification_exportsTool;
  readonly delete_forecast_specification: typeof delete_forecast_specificationTool;
  readonly get_plugin_feedback_step: typeof get_plugin_feedback_stepTool;
  readonly submit_plugin_feedback: typeof submit_plugin_feedbackTool;
  readonly delete_plugin_feedback: typeof delete_plugin_feedbackTool;
} = {
  prepare_forecast_specification_stage:
    prepare_forecast_specification_stageTool,
  propose_forecast_specification_stage_changes:
    propose_forecast_specification_stage_changesTool,
  approve_forecast_specification_stage_proposal:
    approve_forecast_specification_stage_proposalTool,
  discard_forecast_specification_stage_proposal:
    discard_forecast_specification_stage_proposalTool,
  revalidate_unchanged_forecast_specification_stages:
    revalidate_unchanged_forecast_specification_stagesTool,
  continue_forecast_specification: continue_forecast_specificationTool,
  set_forecast_specification_news_choice:
    set_forecast_specification_news_choiceTool,
  get_forecast_specification_stage_review:
    get_forecast_specification_stage_reviewTool,
  start_forecast_specification_impact_review:
    start_forecast_specification_impact_reviewTool,
  generate_forecast_specification_exports:
    generate_forecast_specification_exportsTool,
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
