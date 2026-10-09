import { z } from "zod";
import {
  ResolutionCriteria,
  parseConnectorResolutionCriteria,
} from "./resolution-criteria";
import { ForecastBackgroundInformation } from "./background-information";
import { ForecastNewsTimeline } from "./news-timeline";
import type { DraftUnitT } from "./display-question";
import { MAX_SOURCE_HIERARCHY_ENTRIES, SourceHierarchy } from "./resolution";
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
export const WorkspaceRowId = z
  .uuid()
  .describe(
    "Stable row UUID. Preserve it when editing; assign a new UUID to every newly added row, including news items.",
  );
const text = z.string().max(4000);
const resolutionCriteriaText = z.string().max(16_000);
const presentationText = z.string().max(16_000);
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
  if (draft.candidates.length > 0 && !draft.selected_candidate_id)
    visible.push({
      path: ["selected_candidate_id"],
      code: "selection_required",
      message: "Select a candidate before approval.",
    });
  return visible;
}

export const ContentStage = z.enum([
  "defined_terms",
  "resolution_sources",
  "resolution_criteria",
  "background_information",
  "news_timeline",
]);
export type ContentStage = z.infer<typeof ContentStage>;
export const TermsWorkingDraft = boundedPayload(
  z.strictObject({
    stage: z.literal("defined_terms"),
    definitions: uniqueRows(
      z.strictObject({ id: WorkspaceRowId, term: text, definition: text }),
      50,
    ),
  }),
);
export const SourceWorkingRow = z.strictObject({
  id: WorkspaceRowId,
  source_id: text,
  name: text,
  url: text,
});
export const SourcesWorkingDraft = boundedPayload(
  z.strictObject({
    stage: z.literal("resolution_sources"),
    sources: uniqueRows(SourceWorkingRow, 50),
    condition_sources: uniqueRows(SourceWorkingRow, 50).nullable(),
  }),
);
export const CriteriaWorkingDraft = boundedPayload(
  z.strictObject({
    stage: z.literal("resolution_criteria"),
    resolution_criteria: z.strictObject({
      question: text,
      criteria: resolutionCriteriaText,
    }),
  }),
);
export const BackgroundWorkingDraft = boundedPayload(
  z.strictObject({
    stage: z.literal("background_information"),
    background_information: text,
  }),
);
export const NewsWorkingDraft = boundedPayload(
  z.strictObject({
    stage: z.literal("news_timeline"),
    items: uniqueRows(
      z.strictObject({
        id: WorkspaceRowId,
        unit_number: z.number().int().positive(),
        published_at: z.string().max(64),
        publisher: text,
        url: text,
        summary: z.string().max(1200),
      }),
      12,
    ),
  }),
);
export const NewsChoice = z.enum([
  "undecided",
  "opted_in",
  "declined",
  "unavailable",
]);
export const WorkspaceNextStage = z.enum([
  "defined_terms",
  "resolution_sources",
  "resolution_criteria",
  "background_information",
  "news_timeline",
  "completed",
]);
export const ContentWorkingDraft = z.union([
  TermsWorkingDraft,
  SourcesWorkingDraft,
  CriteriaWorkingDraft,
  BackgroundWorkingDraft,
  NewsWorkingDraft,
]);
export type ContentWorkingDraft = z.infer<typeof ContentWorkingDraft>;
export const WorkspaceDraft = z.union([
  QuestionWorkingDraft,
  ContentWorkingDraft,
]);
export type WorkspaceDraft = z.infer<typeof WorkspaceDraft>;
export const editableWorkspaceStages = z.enum([
  "selected_unit",
  "defined_terms",
  "resolution_sources",
  "resolution_criteria",
  "background_information",
  "news_timeline",
]);
export function contentDomainInput(draft: ContentWorkingDraft) {
  if (draft.stage === "resolution_criteria") {
    return {
      resolution_criteria: {
        ...draft.resolution_criteria,
      },
    };
  }
  if (draft.stage === "background_information")
    return { background_information: draft.background_information };
  if (draft.stage === "news_timeline")
    return {
      news_timeline: { items: draft.items.map(({ id, ...item }) => item) },
    };
  if (draft.stage === "defined_terms")
    return {
      definitions: Object.fromEntries(
        draft.definitions.map((row) => [row.term, row.definition]),
      ),
    };
  const hierarchy = (rows: z.infer<typeof SourceWorkingRow>[]) =>
    rows.map((row, index) => ({
      id: row.source_id,
      rank: index + 1,
      name: row.name,
      ...(row.url ? { url: row.url } : {}),
    }));
  return {
    sources: hierarchy(draft.sources),
    ...(draft.condition_sources !== null
      ? { condition_sources: hierarchy(draft.condition_sources) }
      : {}),
  };
}
/** Stable row diagnostics route to the same validators as submission tools. */
export function validateContentWorkingDraft(
  draft: ContentWorkingDraft,
  conditional = false,
  selectedUnit?: DraftUnitT,
): WorkspaceValidationIssue[] {
  const issues: WorkspaceValidationIssue[] = [];
  const add = (path: string[], message: string) =>
    issues.push({
      path,
      code: "domain_validation",
      message: message.slice(0, 1000),
    });
  const domain = contentDomainInput(draft);
  if (draft.stage === "defined_terms") {
    const terms = new Set<string>();
    for (const row of draft.definitions) {
      if (!row.term.trim())
        add(["definitions", row.id, "term"], "Enter a term.");
      if (!row.definition.trim())
        add(["definitions", row.id, "definition"], "Enter a definition.");
      if (terms.has(row.term))
        add(["definitions", row.id, "term"], "Terms must be unique.");
      terms.add(row.term);
    }
  } else if (draft.stage === "resolution_sources") {
    for (const key of ["sources", "condition_sources"] as const) {
      const rows = draft[key];
      if (rows === null) continue;
      const result = SourceHierarchy.safeParse(
        (domain as Record<string, unknown>)[key],
      );
      if (!result.success)
        for (const issue of result.error.issues) {
          const [index, ...rest] = issue.path;
          add(
            typeof index === "number"
              ? [
                  key,
                  rows[index]!.id,
                  ...rest.map((part) =>
                    part === "id" ? "source_id" : String(part),
                  ),
                ]
              : [key],
            issue.message,
          );
        }
    }
    if (conditional !== (draft.condition_sources !== null))
      add(
        ["condition_sources"],
        conditional
          ? "A conditional unit requires condition sources."
          : "Condition sources require a conditional selected unit.",
      );
  }
  if (
    draft.stage === "resolution_criteria" ||
    draft.stage === "background_information" ||
    draft.stage === "news_timeline"
  ) {
    try {
      if (draft.stage === "resolution_criteria") {
        const criteria = ResolutionCriteria.parse(
          (domain as { resolution_criteria: unknown }).resolution_criteria,
        );
        parseConnectorResolutionCriteria(criteria, selectedUnit);
      } else if (draft.stage === "background_information")
        ForecastBackgroundInformation.parse(draft.background_information);
      else
        ForecastNewsTimeline.parse(
          (domain as { news_timeline: unknown }).news_timeline,
        );
    } catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      for (const issue of error.issues) {
        let path = issue.path.map(String);
        if (path[0] === "resolutionCriteria") path.shift();
        if (
          draft.stage === "resolution_criteria" &&
          path[0] !== "resolution_criteria"
        )
          path = ["resolution_criteria", ...path];
        if (draft.stage === "background_information")
          path = ["background_information"];
        if (
          draft.stage === "news_timeline" &&
          typeof issue.path[1] === "number"
        )
          path[1] = draft.items[issue.path[1]]!.id;
        const message =
          issue.code === "too_small"
            ? "Add enough text to complete this field."
            : issue.code === "invalid_union" && path.at(-1) === "published_at"
              ? "Enter a publication date (YYYY-MM-DD) or an ISO date-time with its offset."
              : issue.code === "invalid_format" && path.at(-1) === "url"
                ? "Enter a valid source URL."
                : issue.message.includes("criteria question must exactly match")
                  ? "Use the exact approved question."
                  : issue.message;
        add(path.length ? path : [draft.stage], message);
      }
    }
  }
  return issues.slice(0, 200);
}
export const contentStageDefinitions = {
  defined_terms: {
    stage: "defined_terms",
    label: "Terms",
    next_stage: "resolution_sources",
    skill: "define-resolution-source",
    fields: [
      {
        path: ["definitions"],
        label: "Definitions",
        control: "rows",
        validation: "Definitions",
      },
      {
        path: ["definitions", "*", "term"],
        label: "Term",
        control: "prose",
        validation: "Definitions.key",
      },
      {
        path: ["definitions", "*", "definition"],
        label: "Definition",
        control: "prose",
        validation: "Definitions.value",
        multiline: true,
      },
    ],
  },
  resolution_sources: {
    stage: "resolution_sources",
    label: "Sources",
    next_stage: "resolution_criteria",
    skill: "define-resolution-criteria",
    fields: ["sources", "condition_sources"].flatMap((key) => [
      {
        path: [key],
        label: key === "sources" ? "Resolution Sources" : "Condition Sources",
        control: "rows",
        maxRows: MAX_SOURCE_HIERARCHY_ENTRIES,
        validation: "SourceHierarchy",
      },
      ...[
        ["source_id", "Source ID"],
        ["name", "Name"],
        ["url", "URL (optional)"],
      ].map(([name, label]) => ({
        path: [key, "*", name!],
        label: label!,
        control: "prose",
        validation: `DataSource.${name === "source_id" ? "id" : name}`,
        ...(name === "source_id" ? { internal: true } : {}),
      })),
    ]),
  },
  resolution_criteria: {
    stage: "resolution_criteria",
    label: "Resolution Criteria",
    next_stage: "background_information",
    skill: "define-background-information",
    fields: [
      {
        path: ["resolution_criteria"],
        label: "Resolution Criteria",
        control: "group",
        validation: "ResolutionCriteria",
      },
      {
        path: ["resolution_criteria", "question"],
        label: "Question",
        control: "prose",
        validation: "ResolutionCriteria.question",
        internal: true,
      },
      {
        path: ["resolution_criteria", "criteria"],
        label: "Resolution Criteria",
        control: "prose",
        multiline: true,
        maxLength: 16_000,
        validation: "ResolutionCriteria.criteria",
      },
    ],
  },
  background_information: {
    stage: "background_information",
    label: "Background",
    next_stage: "news_timeline",
    skill: null,
    fields: [
      {
        path: ["background_information"],
        label: "Background",
        control: "prose",
        multiline: true,
        validation: "ForecastBackgroundInformation",
      },
    ],
  },
  news_timeline: {
    stage: "news_timeline",
    label: "News",
    next_stage: "completed",
    skill: null,
    fields: [
      {
        path: ["items"],
        label: "News",
        control: "rows",
        maxRows: 12,
        validation: "ForecastNewsTimeline",
      },
      {
        path: ["items", "*", "unit_number"],
        label: "News item number",
        control: "prose",
        readOnly: true,
        validation: "ForecastNewsItem.unit_number",
      },
      ...["published_at", "publisher", "url", "summary"].map((key) => ({
        path: ["items", "*", key],
        label: (
          {
            published_at: "Publication Date",
            publisher: "Publisher",
            url: "Source URL",
            summary: "Summary",
          } as Record<string, string>
        )[key]!,
        control: key === "published_at" ? "date" : "prose",
        multiline: key === "summary",
        validation: `ForecastNewsItem.${key}`,
      })),
    ],
  },
} as const;
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
  multiline: z.boolean().optional(),
  internal: z.boolean().optional(),
  readOnly: z.boolean().optional(),
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
  "set_news_choice",
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
  set_news_choice: "Choose news",
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
  stage: editableWorkspaceStages,
};
/** Reads need identity; writes require an exact base and prerequisite bindings. */
export const WorkspaceCommand = boundedPayload(
  z
    .discriminatedUnion("kind", [
      z.strictObject({
        ...commandIdentity,
        kind: z.literal("reopen"),
        stage: editableWorkspaceStages.optional(),
      }),
      z.strictObject({
        ...mutation,
        kind: z.literal("edit_draft"),
        draft: WorkspaceDraft,
      }),
      z.strictObject({
        ...mutation,
        kind: z.literal("submit_proposal"),
        proposal_id: z.uuid(),
        draft: WorkspaceDraft,
        rationale: z.string().trim().min(1).max(1000).optional(),
      }),
      z.strictObject({
        ...mutation,
        kind: z.literal("apply_proposal"),
        proposal_id: z.uuid(),
        draft: WorkspaceDraft.optional().describe(
          "Optional user-selected version when applying only part of a proposal. It must match the command stage.",
        ),
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
        stage: z.literal("selected_unit"),
        kind: z.literal("select_and_approve"),
        candidate_id: WorkspaceRowId,
      }),
      z.strictObject({
        ...mutation,
        stage: z.literal("news_timeline"),
        kind: z.literal("set_news_choice"),
        choice: NewsChoice.exclude(["undecided"]),
      }),
      z.strictObject({ ...mutation, kind: z.literal("approve") }),
      z.strictObject({
        ...mutation,
        stage: z.enum(["selected_unit", "defined_terms"]),
        kind: z.literal("complete_review"),
        approved_revision: WorkspaceRevision,
        feedback: z.string().trim().min(1).max(4000),
      }),
      z.strictObject({
        ...mutation,
        kind: z.literal("continue"),
        approved_revision: WorkspaceRevision,
        next_stage: WorkspaceNextStage,
      }),
    ])
    .superRefine((command, ctx) => {
      if (
        "draft" in command &&
        command.draft &&
        ("stage" in command.draft ? command.draft.stage : "selected_unit") !==
          command.stage
      )
        ctx.addIssue({
          code: "custom",
          path: ["draft"],
          message: "Draft must match the command stage.",
        });
      if (
        command.kind === "continue" &&
        command.next_stage !==
          (command.stage === "selected_unit"
            ? "defined_terms"
            : contentStageDefinitions[command.stage].next_stage)
      )
        ctx.addIssue({
          code: "custom",
          path: ["next_stage"],
          message: "Continue must request the next workflow stage.",
        });
    }),
);
export type WorkspaceCommand = z.infer<typeof WorkspaceCommand>;

const nodeBase = {
  path: WorkspaceFieldPath,
  label: z.string().min(1).max(200),
  maxLength: z.number().int().min(1).max(16_000).optional(),
  multiline: z.boolean().optional(),
  internal: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  emphasis: z.literal("prerequisite").optional(),
};
const leaf = z.discriminatedUnion("control", [
  z.strictObject({
    ...nodeBase,
    control: z.literal("prose"),
    value: presentationText,
  }),
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
    value: z.strictObject({ name: text, url: text }),
  }),
]);
/** Two row levels cover candidate variables and their values without arbitrary recursion. */
const rows = <T extends z.ZodType>(field: T) =>
  z.strictObject({
    ...nodeBase,
    control: z.literal("rows"),
    maxRows: z.number().int().min(1).max(50).optional(),
    template: z.array(leaf).max(12).optional(),
    ordered: z.boolean().optional(),
    identityField: z.string().min(1).max(128).optional(),
    allowAbsent: z.boolean().optional(),
    present: z.boolean().optional(),
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
      export_available: z.boolean().optional(),
      export_complete: z.boolean().optional(),
      stages: z
        .array(
          z.strictObject({
            stage: approvalStageSchema,
            label: z.string().min(1).max(200),
            available: z.boolean(),
            status: z.enum(["not_started", "pending", "approved", "outdated"]),
            has_suggestions: z.boolean().optional(),
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

export const ContentWorkspaceSnapshot = boundedPayload(
  z
    .strictObject({
      forecast_specification_id: ForecastSpecificationId,
      language_code: ForecastSpecificationLanguageCode,
      stage: ContentStage,
      selected_unit: DraftUnit.optional(),
      revision: WorkspaceRevision,
      prerequisite_revisions: WorkspacePrerequisites,
      news_choice: NewsChoice.optional(),
      news_outcome: z
        .enum([
          "undecided",
          "pending",
          "declined",
          "unavailable",
          "empty",
          "approved",
          "outdated",
        ])
        .optional(),
      draft: ContentWorkingDraft,
      approved: z
        .strictObject({
          revision: WorkspaceRevision,
          prerequisite_revisions: WorkspacePrerequisites,
          draft: ContentWorkingDraft,
          outdated: z.boolean(),
        })
        .nullable(),
      terms_review: z
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
            draft: ContentWorkingDraft,
            rationale: z.string().trim().min(1).max(1000).optional(),
          }),
        )
        .max(5),
      presentation: QuestionWorkspaceSnapshot.shape.presentation,
    })
    .superRefine((snapshot, ctx) => {
      if (
        [
          snapshot.draft,
          ...snapshot.proposals.map((p) => p.draft),
          ...(snapshot.approved ? [snapshot.approved.draft] : []),
        ].some((draft) => draft.stage !== snapshot.stage)
      )
        ctx.addIssue({
          code: "custom",
          message: "Snapshot drafts must match its stage.",
        });
    }),
  workspaceReviewLimitBytes,
);
export type ContentWorkspaceSnapshot = z.infer<typeof ContentWorkspaceSnapshot>;
export const WorkspaceSnapshot = z.union([
  QuestionWorkspaceSnapshot,
  ContentWorkspaceSnapshot,
]);
export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshot>;
export const WorkspaceCommandResult = boundedPayload(
  z.discriminatedUnion("status", [
    z.strictObject({
      ...commandIdentity,
      status: z.enum(["snapshot", "saved"]),
      snapshot: WorkspaceSnapshot,
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
      next_stage: WorkspaceNextStage,
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
      workspace: WorkspaceSnapshot,
    }),
    workspaceReviewLimitBytes,
  );
}
