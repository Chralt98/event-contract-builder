import { expect, test } from "bun:test";
import {
  QuestionWorkingDraft,
  QuestionWorkingUnit,
  ForecastCondition,
  QuestionWorkspaceSnapshot,
  WorkspaceCommand,
  WorkspaceCommandResult,
  WorkspaceFieldDefinition,
  parseQuestionWorkingUnit,
  validateQuestionWorkingDraft,
  questionStageDefinition,
  workspaceReviewEnvelopeSchema,
  approvedForecastSpecificationRecallSchema,
} from "../../src/foresight";

const id = () => crypto.randomUUID();
const candidate = {
  id: id(),
  unit: {
    question: "Will <city> report rain tomorrow?",
    variables: [
      { id: id(), name: "city", values: [{ id: id(), value: "Berlin" }] },
    ],
    condition: null,
  },
};
const draft = { candidates: [candidate], selected_candidate_id: candidate.id };
const identity = {
  contract_version: 1 as const,
  command_id: id(),
  forecast_specification_id: id(),
};
const binding = {
  stage: "selected_unit" as const,
  expected_revision: "r1",
  prerequisite_revisions: {},
};
const snapshot = {
  forecast_specification_id: identity.forecast_specification_id,
  language_code: "en",
  revision: "r1",
  stage: "selected_unit" as const,
  draft,
  approved: null,
  question_review: null,
  proposals: [],
  presentation: {
    title: "Forecast question",
    fields: [
      {
        path: ["candidates", candidate.id, "unit", "question"],
        label: "Question",
        control: "prose" as const,
        value: candidate.unit.question,
      },
    ],
    validation_issues: [],
    actions: [
      {
        label: "Select and approve",
        enabled: true,
        command: {
          ...identity,
          ...binding,
          kind: "select_and_approve" as const,
          candidate_id: candidate.id,
        },
      },
    ],
  },
};

test("pilot snapshot keeps editing identities outside valid domain content", () => {
  expect(QuestionWorkspaceSnapshot.parse(snapshot)).toEqual(snapshot);
  const unit = parseQuestionWorkingUnit(candidate.unit);
  expect(unit).toEqual({
    question: candidate.unit.question,
    variables: [{ name: "city", values: ["Berlin"] }],
  });
  expect(validateQuestionWorkingDraft(draft)).toEqual([]);
  for (const field of questionStageDefinition.fields)
    WorkspaceFieldDefinition.parse(field);
});

test("workspace snapshots allow every approved review and proposal section", () => {
  const sections = Array.from({ length: 7 }, (_, index) => ({
    title: `Section ${index + 1}`,
    fields: [],
  }));
  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      presentation: { ...snapshot.presentation, sections },
    }).success,
  ).toBe(true);
  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      presentation: {
        ...snapshot.presentation,
        sections: [...sections, { title: "Section 8", fields: [] }],
      },
    }).success,
  ).toBe(false);
});

test("incomplete saves do not weaken canonical domain validation", () => {
  const incomplete = {
    ...draft,
    candidates: [
      {
        ...candidate,
        unit: {
          ...candidate.unit,
          question: "",
          condition: { statement: "", ifUnmet: null },
        },
      },
    ],
  };
  expect(QuestionWorkingDraft.parse(incomplete)).toEqual(incomplete);
  expect(() =>
    parseQuestionWorkingUnit(incomplete.candidates[0]!.unit),
  ).toThrow();
  expect(
    validateQuestionWorkingDraft(incomplete).map((issue) => issue.path),
  ).toContainEqual(["candidates", candidate.id, "unit", "question"]);
  expect(
    QuestionWorkingDraft.parse({ candidates: [], selected_candidate_id: null }),
  ).toBeDefined();
  expect(
    validateQuestionWorkingDraft({
      candidates: [],
      selected_candidate_id: null,
    })[0]?.code,
  ).toBe("selection_required");
});

test("nested validation paths survive row reordering", () => {
  const variable = {
    id: id(),
    name: "other",
    values: [{ id: id(), value: "" }],
  };
  const invalid = {
    ...candidate,
    unit: {
      ...candidate.unit,
      variables: [...candidate.unit.variables, variable],
    },
  };
  const expectedPath = [
    "candidates",
    candidate.id,
    "unit",
    "variables",
    variable.id,
    "values",
    variable.values[0]!.id,
    "value",
  ];
  for (const variables of [
    invalid.unit.variables,
    invalid.unit.variables.toReversed(),
  ]) {
    expect(
      validateQuestionWorkingDraft({
        ...draft,
        candidates: [{ ...invalid, unit: { ...invalid.unit, variables } }],
      }).map((issue) => issue.path),
    ).toContainEqual(expectedPath);
  }
});

test("duplicate row identities and dangling selection are rejected", () => {
  expect(
    QuestionWorkingDraft.safeParse({
      ...draft,
      candidates: [candidate, candidate],
    }).success,
  ).toBe(false);
  expect(
    QuestionWorkingDraft.safeParse({ ...draft, selected_candidate_id: id() })
      .success,
  ).toBe(false);
  expect(
    QuestionWorkingDraft.safeParse({
      ...draft,
      candidates: [
        {
          ...candidate,
          unit: {
            ...candidate.unit,
            variables: [
              candidate.unit.variables[0],
              candidate.unit.variables[0],
            ],
          },
        },
      ],
    }).success,
  ).toBe(false);
});

test("every mutation requires its base revision and prerequisite bindings", () => {
  const commands = [
    { kind: "edit_draft", draft },
    {
      kind: "submit_proposal",
      proposal_id: id(),
      draft,
      rationale: "An explicit cutoff makes resolution unambiguous.",
    },
    { kind: "apply_proposal", proposal_id: id() },
    { kind: "discard_proposal", proposal_id: id() },
    { kind: "accept_proposal", proposal_id: id() },
    { kind: "select_and_approve", candidate_id: candidate.id },
    { kind: "approve" },
    {
      kind: "continue",
      approved_revision: "approved-1",
      next_stage: "defined_terms",
    },
  ];
  for (const operation of commands) {
    const command = { ...identity, ...binding, ...operation };
    expect<unknown>(WorkspaceCommand.parse(command)).toEqual(command);
    const { expected_revision, ...withoutRevision } = command;
    const { prerequisite_revisions, ...withoutPrerequisites } = command;
    expect(WorkspaceCommand.safeParse(withoutRevision).success).toBe(false);
    expect(WorkspaceCommand.safeParse(withoutPrerequisites).success).toBe(
      false,
    );
    expect(
      WorkspaceCommand.safeParse({ ...command, contract_version: 0 }).success,
    ).toBe(false);
  }
  expect(WorkspaceCommand.parse({ ...identity, kind: "reopen" })).toBeDefined();
});

test("review feedback must contain non-whitespace text", () => {
  const command = {
    ...identity,
    ...binding,
    kind: "complete_review" as const,
    approved_revision: "approved-1",
    feedback: " \t  ",
  };
  expect(WorkspaceCommand.safeParse(command).success).toBe(false);
  expect(
    WorkspaceCommand.parse({ ...command, feedback: "  Looks good.  " }),
  ).toMatchObject({ feedback: "Looks good." });

  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      question_review: {
        approved_revision: "approved-1",
        feedback: " \t  ",
      },
    }).success,
  ).toBe(false);
});

test("conflicts and Continue carry recoverable, revision-bound intent", () => {
  expect(
    WorkspaceCommandResult.parse({
      ...identity,
      status: "conflict",
      expected_revision: "r1",
      current_revision: "r2",
      reason: "stale_revision",
      recovery: "reopen_and_reconcile",
    }),
  ).toBeDefined();
  expect(
    WorkspaceCommandResult.parse({
      ...identity,
      status: "continue_intent",
      language_code: "en",
      approved_revision: "approved-1",
      next_stage: "defined_terms",
      chat_instruction: "Define terms for this forecast.",
    }),
  ).toBeDefined();
  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      presentation: {
        ...snapshot.presentation,
        actions: [{ ...snapshot.presentation.actions[0], enabled: false }],
      },
    }).success,
  ).toBe(false);
});

test("versioned review wraps strict output and rejects obsolete envelopes", () => {
  const schema = workspaceReviewEnvelopeSchema(
    approvedForecastSpecificationRecallSchema.strict(),
  );
  const domain = {
    forecast_specification_id: identity.forecast_specification_id,
    language_code: "en",
    unit_number: 1,
    selected_unit: parseQuestionWorkingUnit(candidate.unit),
  };
  const envelope = {
    contract_version: 1 as const,
    domain,
    workspace: snapshot,
  };
  expect(schema.parse(envelope)).toEqual(envelope);
  expect(
    schema.safeParse({ ...envelope, contract_version: undefined }).success,
  ).toBe(false);
  expect(schema.safeParse({ ...envelope, contract_version: 0 }).success).toBe(
    false,
  );
  expect(
    schema.safeParse({ ...envelope, domain: { ...domain, revision: "r1" } })
      .success,
  ).toBe(false);
});

test("whole payload and collection bounds prevent multiplied unbounded drafts", () => {
  const huge = {
    candidates: Array.from({ length: 20 }, () => ({
      id: id(),
      unit: {
        question: "q".repeat(4000),
        condition: null,
        variables: Array.from({ length: 5 }, () => ({
          id: id(),
          name: "n".repeat(4000),
          values: [],
        })),
      },
    })),
    selected_candidate_id: null,
  };
  expect(
    WorkspaceCommand.safeParse({
      ...identity,
      ...binding,
      kind: "edit_draft",
      draft: huge,
    }).success,
  ).toBe(false);
  expect(
    QuestionWorkingDraft.safeParse({
      ...draft,
      candidates: Array.from({ length: 21 }, () => ({
        ...candidate,
        id: id(),
      })),
    }).success,
  ).toBe(false);
});

test("a working replacement and proposal preserve an independent approved snapshot", () => {
  const revised = {
    ...snapshot,
    draft: { candidates: [], selected_candidate_id: null },
    approved: {
      revision: "approved-1",
      prerequisite_revisions: {},
      candidate_id: candidate.id,
      unit: parseQuestionWorkingUnit(candidate.unit),
      outdated: false,
    },
    proposals: [
      { id: id(), base_revision: "r1", prerequisite_revisions: {}, draft },
    ],
  };
  expect(QuestionWorkspaceSnapshot.parse(revised).approved?.unit.question).toBe(
    candidate.unit.question,
  );
  expect(
    QuestionWorkspaceSnapshot.parse(revised).proposals[0]?.base_revision,
  ).toBe("r1");
});

test("all shared primitives accept editable values and bounded diagnostics", () => {
  const label = "Field";
  const fields = [
    { control: "date", path: ["date"], label, value: "" },
    {
      control: "choice",
      path: ["choice"],
      label,
      value: null,
      options: [{ value: "annulled", label: "Annul" }],
    },
    {
      control: "source",
      path: ["source"],
      label,
      value: { name: "", url: "", publisher: "" },
    },
    {
      control: "group",
      path: ["condition"],
      label,
      present: false,
      fields: [],
    },
    {
      control: "rows",
      path: ["variables"],
      label,
      rows: [
        {
          id: id(),
          fields: [{ control: "rows", path: ["values"], label, rows: [] }],
        },
      ],
    },
  ];
  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      presentation: { ...snapshot.presentation, fields },
    }).success,
  ).toBe(true);
  const incomplete = {
    candidates: Array.from({ length: 4 }, () => ({
      id: id(),
      unit: {
        question: `<${"x".repeat(1900)}>?`,
        condition: null,
        variables: Array.from({ length: 5 }, () => ({
          id: id(),
          name: "",
          values: Array.from({ length: 20 }, () => ({ id: id(), value: "" })),
        })),
      },
    })),
    selected_candidate_id: null,
  };
  const issues = validateQuestionWorkingDraft(incomplete);
  expect(issues.length).toBeLessThanOrEqual(200);
  expect(issues.at(-1)?.code).toBe("selection_required");
  expect(
    QuestionWorkspaceSnapshot.safeParse({
      ...snapshot,
      draft: incomplete,
      presentation: { ...snapshot.presentation, validation_issues: issues },
    }).success,
  ).toBe(true);
});

test("working condition uses canonical dispositions while permitting incomplete choice", () => {
  for (const ifUnmet of ForecastCondition.shape.ifUnmet.options) {
    expect(
      QuestionWorkingUnit.safeParse({
        ...candidate.unit,
        condition: { statement: "", ifUnmet },
      }).success,
    ).toBe(true);
  }
  expect(
    QuestionWorkingUnit.safeParse({
      ...candidate.unit,
      condition: { statement: "", ifUnmet: "invented" },
    }).success,
  ).toBe(false);
  expect(
    QuestionWorkingUnit.safeParse({
      ...candidate.unit,
      condition: {
        statement: "",
        ifUnmet: "custom",
        customIfUnmet: "",
      },
    }).success,
  ).toBe(true);
  expect(
    questionStageDefinition.fields.find(
      (field) => field.path.join(".") === "condition.ifUnmet",
    ),
  ).toMatchObject({
    label: "IF NOT",
    options: [
      { value: "annulled", label: "Annulled" },
      { value: "resolve-no", label: "Resolve No" },
      { value: "resolve-yes", label: "Resolve Yes" },
      { value: "resolve-50-50", label: "Resolve 50-50" },
      { value: "custom", label: "Custom" },
    ],
  });
});
