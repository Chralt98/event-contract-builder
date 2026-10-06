import { z } from "zod";
import {
  DraftUnit,
  ForecastCondition,
  MAX_TEMPLATE_VARIABLES,
  MAX_VARIABLE_VALUES,
} from "./display-question";
import {
  ForecastSpecificationId,
  ForecastSpecificationLanguageCode,
  approvalStageSchema,
} from "./workflow";

/** Version of the workspace wire contract, independent of the MCP protocol. */
export const workspaceContractVersion = 1 as const;
export const WorkspaceRevision = z
  .string({
    error:
      "Missing revision. Reopen the workspace or fetch get_forecast_stage_review, review and retry.",
  })
  .min(1)
  .max(128);
export const WorkspaceRowId = z.uuid();
const text = z.string().max(4000);
export const workspacePayloadLimitBytes = 256 * 1024;
export const workspaceReviewLimitBytes = 2 * 1024 * 1024;
function boundedPayload<T extends z.ZodType>(
  schema: T,
  limit = workspacePayloadLimitBytes,
) {
  return schema.superRefine((value, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > limit)
      ctx.addIssue({
        code: "custom",
        message: `Workspace payload exceeds ${limit / 1024} KiB.`,
      });
  });
}
const uniqueRows = <T extends z.ZodType<{ id: string }>>(
  row: T,
  limit: number,
) =>
  z
    .array(row)
    .max(limit)
    .superRefine((rows, ctx) => {
      const ids = rows.map((entry) => entry.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: "Row IDs must be unique." });
    });

/** Incomplete values are saveable; approval must also pass DraftUnit. */
export const QuestionWorkingUnit = z.strictObject({
  question: text,
  variables: uniqueRows(
    z.strictObject({
      id: WorkspaceRowId,
      name: text,
      values: uniqueRows(
        z.strictObject({ id: WorkspaceRowId, value: text }),
        MAX_VARIABLE_VALUES,
      ),
    }),
    MAX_TEMPLATE_VARIABLES,
  ),
  condition: z
    .strictObject({
      statement: text,
      ifUnmet: ForecastCondition.shape.ifUnmet.nullable(),
      customIfUnmet: text.optional(),
    })
    .nullable(),
});
export const QuestionWorkingDraft = boundedPayload(
  z
    .strictObject({
      candidates: uniqueRows(
        z.strictObject({
          id: WorkspaceRowId,
          unit: QuestionWorkingUnit,
        }),
        20,
      ),
      selected_candidate_id: WorkspaceRowId.nullable(),
    })
    .superRefine((draft, ctx) => {
      if (
        draft.selected_candidate_id &&
        !draft.candidates.some(
          (candidate) => candidate.id === draft.selected_candidate_id,
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["selected_candidate_id"],
          message: "Selected candidate must exist in this draft.",
        });
    }),
);
export type QuestionWorkingDraft = z.infer<typeof QuestionWorkingDraft>;
export type QuestionWorkingUnit = z.infer<typeof QuestionWorkingUnit>;

/** Stable paths use row IDs rather than array positions or translated labels. */
export const WorkspaceFieldPath = z
  .array(z.string().min(1).max(128))
  .min(1)
  .max(12);
export const WorkspaceValidationIssue = z.strictObject({
  path: WorkspaceFieldPath,
  code: z.enum(["domain_validation", "required", "selection_required"]),
  message: z.string().min(1).max(1000),
});
export type WorkspaceValidationIssue = z.infer<typeof WorkspaceValidationIssue>;

/** Strip editing identities before using the canonical domain validator/export. */
function questionDomainInput(unit: QuestionWorkingUnit) {
  return {
    question: unit.question,
    ...(unit.variables.length
      ? {
          variables: unit.variables.map((variable) => ({
            name: variable.name,
            values: variable.values.map((value) => value.value),
          })),
        }
      : {}),
    ...(unit.condition ? { condition: unit.condition } : {}),
  };
}

export function parseQuestionWorkingUnit(unit: QuestionWorkingUnit) {
  return DraftUnit.parse(questionDomainInput(QuestionWorkingUnit.parse(unit)));
}

/** Bounded field diagnostics; revalidate after corrections to reveal remaining errors. */
export function validateQuestionWorkingDraft(
  input: QuestionWorkingDraft,
): WorkspaceValidationIssue[] {
  const draft = QuestionWorkingDraft.parse(input);
  const issues: WorkspaceValidationIssue[] = [];
  for (const candidate of draft.candidates) {
    const result = DraftUnit.safeParse(questionDomainInput(candidate.unit));
    if (result.success) continue;
    for (const issue of result.error.issues) {
      const path = issue.path.map((part, index, parts) => {
        if (typeof part !== "number") return String(part);
        const variable = candidate.unit.variables[part];
        if (parts[index - 1] === "variables") return variable!.id;
        if (parts[index - 1] === "values") {
          const variableIndex = parts[index - 2] as number;
          return candidate.unit.variables[variableIndex]!.values[part]!.id;
        }
        return String(part);
      });
      if (
        typeof issue.path.at(-1) === "number" &&
        issue.path.at(-2) === "values"
      )
        path.push("value");
      issues.push({
        path: ["candidates", candidate.id, "unit", ...path],
        code: "domain_validation",
        message: issue.message.slice(0, 1000),
      });
    }
  }
  // Reserve room for the selection error even on a heavily incomplete draft.
  const visible = issues.slice(0, draft.selected_candidate_id ? 200 : 199);
  if (!draft.selected_candidate_id)
    visible.push({
      path: ["selected_candidate_id"],
      code: "selection_required",
      message: "Select a candidate before approval.",
    });
  return visible;
}

export const WorkspaceControlKind = z.enum([
  "prose",
  "date",
  "choice",
  "rows",
  "group",
  "source",
]);
/** Descriptors route validation to canonical schemas; they do not copy rules. */
export const WorkspaceFieldDefinition = z.strictObject({
  path: WorkspaceFieldPath,
  label: z.string().min(1).max(200),
  control: WorkspaceControlKind,
  validation: z.string().min(1).max(200),
  emphasis: z.literal("prerequisite").optional(),
  options: z
    .array(
      z.strictObject({
        value: z.string().max(200),
        label: z.string().max(200),
      }),
    )
    .max(50)
    .optional(),
});
export const questionStageDefinition = {
  stage: "selected_unit",
  label: "Question",
  fields: [
    {
      path: ["condition"],
      label: "Condition",
      control: "group",
      validation: "ForecastCondition",
      emphasis: "prerequisite",
    },
    {
      path: ["condition", "statement"],
      label: "Statement",
      control: "prose",
      validation: "ConditionStatement",
    },
    {
      path: ["condition", "ifUnmet"],
      label: "IF NOT",
      control: "choice",
      validation: "ForecastCondition.ifUnmet",
      options: ForecastCondition.shape.ifUnmet.options.map((value) => ({
        value,
        label:
          value === "annulled"
            ? "Annulled"
            : value === "resolve-no"
              ? "Resolve No"
              : value === "resolve-yes"
                ? "Resolve Yes"
                : value === "resolve-50-50"
                  ? "Resolve 50-50"
                  : "Custom",
      })),
    },
    {
      path: ["condition", "customIfUnmet"],
      label: "Custom action",
      control: "prose",
      validation: "ForecastCondition.customIfUnmet",
    },
    {
      path: ["question"],
      label: "Question",
      control: "prose",
      validation: "DraftUnit.question",
    },
    {
      path: ["variables"],
      label: "Variables",
      control: "rows",
      validation: "DraftUnit.variables",
    },
    {
      path: ["variables", "*", "name"],
      label: "Variable name",
      control: "prose",
      validation: "TemplateVariable.name",
    },
    {
      path: ["variables", "*", "values"],
      label: "Values",
      control: "rows",
      validation: "TemplateVariable.values",
    },
    {
      path: ["variables", "*", "values", "*", "value"],
      label: "Value",
      control: "prose",
      validation: "TemplateVariable.values[]",
    },
  ],
} as const;

export const WorkspaceActionKind = z.enum([
  "reopen",
  "edit_draft",
  "submit_proposal",
  "apply_proposal",
  "discard_proposal",
  "accept_proposal",
  "select_and_approve",
  "approve",
  "complete_review",
  "continue",
]);
export const workspaceActionLabels = {
  reopen: "Refresh",
  edit_draft: "Save draft",
  submit_proposal: "Propose changes",
  apply_proposal: "Apply",
  discard_proposal: "Discard",
  accept_proposal: "Accept suggestion",
  select_and_approve: "Select and approve",
  approve: "Approve",
  complete_review: "Complete AI review",
  continue: "Continue",
} satisfies Record<z.infer<typeof WorkspaceActionKind>, string>;
export const WorkspacePrerequisites = z.partialRecord(
  approvalStageSchema,
  WorkspaceRevision,
);
export const workspaceRevisionBindingShape = {
  expected_revision: WorkspaceRevision,
  prerequisite_revisions: WorkspacePrerequisites,
};
const commandIdentity = {
  contract_version: z.literal(workspaceContractVersion),
  command_id: z.uuid(),
  forecast_specification_id: ForecastSpecificationId,
};
const mutation = {
  ...commandIdentity,
  ...workspaceRevisionBindingShape,
  stage: z.literal("selected_unit"),
};
/** Reads need identity; writes require an exact base and prerequisite bindings. */
export const WorkspaceCommand = boundedPayload(
  z.discriminatedUnion("kind", [
    z.strictObject({ ...commandIdentity, kind: z.literal("reopen") }),
    z.strictObject({
      ...mutation,
      kind: z.literal("edit_draft"),
      draft: QuestionWorkingDraft,
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("submit_proposal"),
      proposal_id: z.uuid(),
      draft: QuestionWorkingDraft,
      rationale: z.string().trim().min(1).max(1000).optional(),
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("apply_proposal"),
      proposal_id: z.uuid(),
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("discard_proposal"),
      proposal_id: z.uuid(),
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("accept_proposal"),
      proposal_id: z.uuid(),
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("select_and_approve"),
      candidate_id: WorkspaceRowId,
    }),
    z.strictObject({ ...mutation, kind: z.literal("approve") }),
    z.strictObject({
      ...mutation,
      kind: z.literal("complete_review"),
      approved_revision: WorkspaceRevision,
      feedback: z.string().trim().min(1).max(4000),
    }),
    z.strictObject({
      ...mutation,
      kind: z.literal("continue"),
      approved_revision: WorkspaceRevision,
      next_stage: z.literal("defined_terms"),
    }),
  ]),
);
export type WorkspaceCommand = z.infer<typeof WorkspaceCommand>;

const nodeBase = {
  path: WorkspaceFieldPath,
  label: z.string().min(1).max(200),
  emphasis: z.literal("prerequisite").optional(),
};
const leaf = z.discriminatedUnion("control", [
  z.strictObject({ ...nodeBase, control: z.literal("prose"), value: text }),
  z.strictObject({
    ...nodeBase,
    control: z.literal("date"),
    value: z.string().max(64),
  }),
  z.strictObject({
    ...nodeBase,
    control: z.literal("choice"),
    value: z.string().max(200).nullable(),
    options: z
      .array(
        z.strictObject({
          value: z.string().max(200),
          label: z.string().max(200),
        }),
      )
      .max(50),
  }),
  z.strictObject({
    ...nodeBase,
    control: z.literal("source"),
    value: z.strictObject({ name: text, url: text, publisher: text }),
  }),
]);
/** Two row levels cover candidate variables and their values without arbitrary recursion. */
const rows = <T extends z.ZodType>(field: T) =>
  z.strictObject({
    ...nodeBase,
    control: z.literal("rows"),
    rows: uniqueRows(
      z.strictObject({ id: WorkspaceRowId, fields: z.array(field).max(12) }),
      50,
    ),
  });
const presentationGroup = z.strictObject({
  ...nodeBase,
  control: z.literal("group"),
  present: z.boolean(),
  fields: z.array(z.union([leaf, rows(z.union([leaf, rows(leaf)]))])).max(12),
});
export const WorkspacePresentationField = z.union([
  leaf,
  rows(z.union([leaf, rows(leaf)])),
  z.strictObject({
    ...nodeBase,
    control: z.literal("group"),
    present: z.boolean(),
    fields: z
      .array(
        z.union([leaf, rows(z.union([leaf, rows(leaf)])), presentationGroup]),
      )
      .max(12),
  }),
]);
export const WorkspaceAvailableAction = z
  .strictObject({
    command: WorkspaceCommand,
    label: z.string().min(1).max(200),
    enabled: z.boolean(),
    disabled_reason: z.string().min(1).max(1000).optional(),
  })
  .superRefine((action, ctx) => {
    if (!action.enabled && !action.disabled_reason)
      ctx.addIssue({
        code: "custom",
        path: ["disabled_reason"],
        message: "Disabled actions need a reason.",
      });
  });
export const workspaceStageLabels = {
  selected_unit: "Question",
  defined_terms: "Terms",
  resolution_sources: "Sources",
  resolution_criteria: "Criteria",
  background_information: "Background",
  news_timeline: "News",
} as const;

export const QuestionWorkspaceSnapshot = boundedPayload(
  z.strictObject({
    forecast_specification_id: ForecastSpecificationId,
    language_code: ForecastSpecificationLanguageCode,
    revision: WorkspaceRevision,
    stage: z.literal("selected_unit"),
    draft: QuestionWorkingDraft,
    approved: z
      .strictObject({
        revision: WorkspaceRevision,
        prerequisite_revisions: WorkspacePrerequisites,
        candidate_id: WorkspaceRowId,
        unit: DraftUnit,
        outdated: z.boolean(),
      })
      .nullable(),
    question_review: z
      .strictObject({
        approved_revision: WorkspaceRevision,
        feedback: z.string().trim().min(1).max(4000),
      })
      .nullable()
      .default(null),
    proposals: z
      .array(
        z.strictObject({
          id: z.uuid(),
          base_revision: WorkspaceRevision,
          prerequisite_revisions: WorkspacePrerequisites,
          draft: QuestionWorkingDraft,
          rationale: z.string().trim().min(1).max(1000).optional(),
        }),
      )
      .max(5),
    presentation: z.strictObject({
      title: z.string().min(1).max(200),
      stages: z
        .array(
          z.strictObject({
            stage: approvalStageSchema,
            label: z.string().min(1).max(200),
            available: z.boolean(),
            status: z.enum(["not_started", "pending", "approved", "outdated"]),
          }),
        )
        .max(6)
        .optional(),
      fields: z.array(WorkspacePresentationField).max(20),
      sections: z
        .array(
          z.strictObject({
            title: z.string().min(1).max(200),
            status: z.string().min(1).max(1000).optional(),
            fields: z.array(WorkspacePresentationField).max(20),
          }),
        )
        .max(7)
        .optional(),
      validation_issues: z.array(WorkspaceValidationIssue).max(200),
      actions: z.array(WorkspaceAvailableAction).max(40),
    }),
  }),
  workspaceReviewLimitBytes,
);
export type QuestionWorkspaceSnapshot = z.infer<
  typeof QuestionWorkspaceSnapshot
>;

export const WorkspaceCommandResult = boundedPayload(
  z.discriminatedUnion("status", [
    z.strictObject({
      ...commandIdentity,
      status: z.enum(["snapshot", "saved"]),
      snapshot: QuestionWorkspaceSnapshot,
    }),
    z.strictObject({
      ...commandIdentity,
      status: z.literal("conflict"),
      expected_revision: WorkspaceRevision,
      current_revision: WorkspaceRevision,
      reason: z.enum([
        "stale_revision",
        "stale_prerequisite",
        "stale_proposal",
      ]),
      recovery: z.literal("reopen_and_reconcile"),
    }),
    z.strictObject({
      ...commandIdentity,
      status: z.literal("invalid"),
      issues: z.array(WorkspaceValidationIssue).min(1).max(200),
      recovery: z.literal("edit_and_retry"),
    }),
    z.strictObject({
      ...commandIdentity,
      status: z.literal("failed"),
      message: z.string().min(1).max(1000),
      retryable: z.boolean(),
    }),
    z.strictObject({
      ...commandIdentity,
      status: z.literal("continue_intent"),
      language_code: ForecastSpecificationLanguageCode,
      approved_revision: WorkspaceRevision,
      next_stage: z.literal("defined_terms"),
      chat_instruction: z.string().min(1).max(4000),
    }),
  ]),
  workspaceReviewLimitBytes,
);
export type WorkspaceCommandResult = z.infer<typeof WorkspaceCommandResult>;

/** Wrap strict domain output instead of silently adding fields to existing tools. */
export function workspaceReviewEnvelopeSchema<T extends z.ZodType>(domain: T) {
  return boundedPayload(
    z.strictObject({
      contract_version: z.literal(workspaceContractVersion),
      domain,
      workspace: QuestionWorkspaceSnapshot,
    }),
    workspaceReviewLimitBytes,
  );
}
