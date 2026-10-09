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
  contentStageDefinitions,
  validateContentWorkingDraft,
  contentDomainInput,
  CriteriaWorkingDraft,
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
    }),
  ).toEqual([]);
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
    {
      kind: "apply_proposal",
      proposal_id: id(),
      stage: "defined_terms",
      draft: {
        stage: "defined_terms",
        definitions: [{ id: id(), term: "Rain", definition: "Precipitation." }],
      },
    },
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
  expect(
    WorkspaceCommand.safeParse({
      ...identity,
      ...binding,
      stage: "defined_terms",
      kind: "complete_review",
      approved_revision: "approved-terms-1",
      feedback: "Definitions are clear and scoped.",
    }).success,
  ).toBe(true);
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
      value: { name: "", url: "" },
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

test("migrated stage drafts are bounded, preserve incomplete rows, and bind commands to their stage", async () => {
  const { ContentWorkingDraft, validateContentWorkingDraft, SourceHierarchy } =
    await import("../../src/foresight");
  const terms = {
    stage: "defined_terms" as const,
    definitions: [{ id: id(), term: "rain", definition: "" }],
  };
  expect(ContentWorkingDraft.safeParse(terms).success).toBe(true);
  expect(validateContentWorkingDraft(terms)).toHaveLength(1);
  expect(
    validateContentWorkingDraft({ stage: "defined_terms", definitions: [] }),
  ).toEqual([]);
  const duplicate = {
    ...terms,
    definitions: [
      { ...terms.definitions[0]!, definition: "Daily report." },
      { id: id(), term: "rain", definition: "Daily report." },
    ],
  };
  expect(
    validateContentWorkingDraft(duplicate).some((issue) =>
      issue.message.includes("unique"),
    ),
  ).toBe(true);
  expect(
    ContentWorkingDraft.safeParse({
      ...terms,
      definitions: Array.from({ length: 51 }, () => ({
        id: id(),
        term: "",
        definition: "",
      })),
    }).success,
  ).toBe(false);
  expect(
    WorkspaceCommand.safeParse({
      ...identity,
      ...binding,
      kind: "edit_draft",
      draft: terms,
    }).success,
  ).toBe(false);
  expect(
    WorkspaceCommand.safeParse({
      ...identity,
      ...binding,
      stage: "defined_terms",
      kind: "edit_draft",
      draft: terms,
    }).success,
  ).toBe(true);
  expect(
    WorkspaceCommand.safeParse({
      ...identity,
      ...binding,
      stage: "defined_terms",
      kind: "continue",
      approved_revision: "approved",
      next_stage: "resolution_criteria",
    }).success,
  ).toBe(false);
  const source = {
    id: "primary",
    rank: 1,
    name: "Weather Agency",
  };
  expect(
    contentStageDefinitions.resolution_sources.fields
      .filter((field) => field.control === "rows")
      .map((field) => ("maxRows" in field ? field.maxRows : undefined)),
  ).toEqual([4, 4]);
  expect(
    contentStageDefinitions.resolution_sources.fields
      .filter((field) => field.control === "rows")
      .map((field) => field.label),
  ).toEqual(["Resolution Sources", "Condition Sources"]);
  const sourceFieldLabels = contentStageDefinitions.resolution_sources.fields
    .filter((field) => field.control !== "rows")
    .map((field) => field.label);
  expect(sourceFieldLabels).toEqual(
    expect.arrayContaining(["Name", "URL (optional)"]),
  );
  expect(sourceFieldLabels).not.toEqual(
    expect.arrayContaining(["Publisher", "Dataset ID"]),
  );
  expect(SourceHierarchy.safeParse([source]).success).toBe(true);
  const fourSources = Array.from({ length: 4 }, (_, index) => ({
    id: `agency-${index}`,
    rank: index + 1,
    name: `Agency ${index}`,
    url: `https://agency-${index}.example/results`,
  }));
  expect(SourceHierarchy.safeParse(fourSources).success).toBe(true);
  const fiveSources = [
    ...fourSources,
    {
      id: "agency-4",
      rank: 5,
      name: "Agency 4",
      url: "https://agency-4.example/results",
    },
  ];
  expect(SourceHierarchy.safeParse(fiveSources).success).toBe(false);
  expect(
    SourceHierarchy.safeParse([
      source,
      { ...source, rank: 2, name: "Independent Agency" },
    ]).success,
  ).toBe(false);
});

test("Criteria and News workspace approval reuse canonical identity and ordering validators", () => {
  const unit = {
    question: "Will Berlin report rain tomorrow?",
    condition: {
      statement: "The report is published",
      ifUnmet: "annulled" as const,
    },
  };
  const criteria = {
    stage: "resolution_criteria" as const,
    resolution_criteria: {
      question: unit.question,
      criteria:
        "Outcome Rules: This market settles Yes if the approved daily report records precipitation by October 5, 2026; otherwise, it settles No. Resolution Sources: Use the approved daily report. Resolution Method: Read the report for the target date and compare its measured value to the outcome rule. Exceptions and Unresolved Outcomes: If evidence is insufficient, mark the result Ambiguous.",
    },
  };
  expect(validateContentWorkingDraft(criteria, true, unit)).toEqual([]);
  const mismatch = structuredClone(criteria);
  mismatch.resolution_criteria.question = "Will Paris report rain tomorrow?";
  expect(
    validateContentWorkingDraft(mismatch, true, unit).length,
  ).toBeGreaterThan(0);
  const news = {
    stage: "news_timeline" as const,
    items: [
      {
        id: id(),
        unit_number: 7,
        published_at: "2026-10-07T11:00:00+02:00",
        publisher: "Agency",
        url: "https://example.com/update",
        summary: "The agency published an updated report.",
      },
      {
        id: id(),
        unit_number: 3,
        published_at: "2026-10-06",
        publisher: "Agency",
        url: "https://example.com/report",
        summary: "The agency published its initial report.",
      },
    ],
  };
  expect(validateContentWorkingDraft(news)).toEqual([]);
  expect(contentDomainInput(news).news_timeline!.items[0]).not.toHaveProperty(
    "id",
  );
  news.items.reverse();
  expect(validateContentWorkingDraft(news).length).toBeGreaterThan(0);
  news.items[0]!.published_at = "";
  expect(validateContentWorkingDraft(news).length).toBeGreaterThan(0);
});

test("Criteria keeps one complete open-text field without requiring a fixed lead-in", () => {
  const draft = {
    stage: "resolution_criteria" as const,
    resolution_criteria: {
      question: "Will Berlin report rain tomorrow?",
      criteria:
        "This market settles Yes if the Weather Service reports rain by October 22. Otherwise, it resolves No. Use the official report, read the published value for the target date, and apply the rule. Annul if evidence is unavailable.",
    },
  };
  expect(contentDomainInput(draft).resolution_criteria).toEqual(
    draft.resolution_criteria,
  );
});

test("Criteria permits a full combined draft larger than an individual field", () => {
  expect(
    CriteriaWorkingDraft.safeParse({
      stage: "resolution_criteria",
      resolution_criteria: {
        question: "Will the report meet the threshold?",
        criteria: "x".repeat(12_000),
      },
    }).success,
  ).toBe(true);
});

test("Criteria exposes one editable field and retains the question internally", () => {
  expect(contentStageDefinitions.resolution_criteria.label).toBe(
    "Resolution Criteria",
  );
  expect(contentStageDefinitions.resolution_criteria.fields[0]?.label).toBe(
    "Resolution Criteria",
  );
  const fields = contentStageDefinitions.resolution_criteria.fields.filter(
    (field) =>
      field.control === "prose" && !("internal" in field && field.internal),
  );
  expect(fields.map((field) => field.label)).toEqual(["Resolution Criteria"]);
  expect(
    contentStageDefinitions.resolution_criteria.fields.filter(
      (field) =>
        field.control === "prose" && "internal" in field && field.internal,
    ),
  ).toHaveLength(1);
  expect(
    fields.every((field) => !("readOnly" in field) || !field.readOnly),
  ).toBe(true);
});

test("News timeline fields use title case for Publication Date", () => {
  expect(contentStageDefinitions.news_timeline.fields[0]?.label).toBe("News");
  expect(
    contentStageDefinitions.news_timeline.fields
      .filter((field) => field.path.length > 2)
      .map((field) => field.label),
  ).toEqual([
    "News item number",
    "Publication Date",
    "Publisher",
    "Source URL",
    "Summary",
  ]);
});
