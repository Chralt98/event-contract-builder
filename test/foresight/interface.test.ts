import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  DataSource,
  ForecastBackgroundInformation,
  ForecastNewsTimeline,
  approvalStageSchema,
  canonicalizeForecastSpecificationLanguageCode,
  ForecastSpecificationLanguageCode,
  foresightTools,
  parseConnectorResolutionCriteria,
  parseConnectorDraftUnit,
  foresightServerInstructions,
} from "../../src/foresight";

const source = {
  id: "agency-results",
  rank: 1,
  name: "Agency results",
  publisher: "Agency One",
  url: "https://one.example/results",
};
const input = {
  unit_number: 1,
  selected_unit: {
    question: "Will it rain tomorrow?",
  },
  sources: [source],
  followUp: "Does this hierarchy look right?",
};

const criteria = {
  questionRule: {
    question: input.selected_unit.question,
    resolvesYesWhen:
      "The approved source reports that measurable rainfall occurred before the question deadline.",
    resolvesNoWhen:
      "The approved source reports no measurable rainfall by the deadline, or the Yes condition is otherwise not met.",
  },
  evidenceAndSourceRules:
    "Use the highest-ranked approved source that publishes a result by the deadline. Apply an official correction published before resolution.",
  exceptionAndUnresolvedRules:
    "If no approved source can establish the result by the resolution deadline, apply the platform's documented unresolved-outcome policy.",
};

const backgroundInformation =
  "The local observatory publishes daily weather measurements for the surrounding area.";

describe("public forecast interface", () => {
  test("forecast sources use the Foresight source schema", () => {
    expect(DataSource.parse(source)).toEqual(source);
    expect(Object.keys(DataSource.shape).sort()).toEqual(
      ["id", "rank", "name", "publisher", "url", "datasetId"].sort(),
    );
  });

  test("source schemas retain rank and duplicate validation", () => {
    const schema = z.object(
      foresightTools.submit_resolution_source.inputSchema,
    );
    expect(schema.shape).not.toHaveProperty("coverage_gaps");
    expect(schema.shape).not.toHaveProperty(
      "alternative_forecast_specification",
    );
    expect(schema.safeParse(input).success).toBe(true);
    const fallback = {
      ...source,
      id: "agency-two",
      rank: 2,
      publisher: "Agency Two",
      url: "https://two.example/results",
    };
    expect(
      schema.safeParse({ ...input, sources: [fallback, source] }).success,
    ).toBe(true);
    for (const invalid of [
      [],
      [{ ...source, rank: 2 }],
      [source, { ...fallback, rank: 3 }],
      [source, { ...fallback, publisher: "Agency One, Inc." }],
      [source, { ...fallback, url: source.url + "/" }],
    ]) {
      expect(schema.safeParse({ ...input, sources: invalid }).success).toBe(
        false,
      );
    }
  });

  test("conditional sources use an independently validated hierarchy", () => {
    const schema = z.object(
      foresightTools.submit_resolution_source.inputSchema,
    );
    const conditionalUnit = {
      question: "Will Alice win the election?",
      condition: {
        statement: "Alice appears on the final ballot",
        ifUnmet: "annulled" as const,
      },
    };
    expect(
      schema.safeParse({
        ...input,
        selected_unit: conditionalUnit,
        condition_sources: [source],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...input,
        selected_unit: conditionalUnit,
        condition_sources: [{ ...source, rank: 2 }],
      }).success,
    ).toBe(false);
  });

  test("resolution sources may identify social accounts without a URL", () => {
    const accountSource = {
      id: "truth-social-account",
      rank: 1,
      name: "Verified account @realDonaldTrump",
      publisher: "Truth Social",
    };
    const schema = z.object(
      foresightTools.submit_resolution_source.inputSchema,
    );

    expect(DataSource.parse(accountSource)).toEqual(accountSource);
    expect(
      schema.safeParse({ ...input, sources: [accountSource] }).success,
    ).toBe(true);
  });

  test("connector shape stays flat while runtime validates domain invariants", () => {
    const schema = z.toJSONSchema(
      z.object(foresightTools.submit_selected_unit.inputSchema),
    );
    const draftSchema = z.toJSONSchema(
      z.object(foresightTools.submit_drafted_questions.inputSchema),
    );
    const unit = schema.properties!.selected_unit!;
    expect(unit).not.toHaveProperty("oneOf");
    expect(draftSchema.properties!.language_code).not.toHaveProperty("pattern");
    expect(draftSchema.required).toEqual(
      expect.arrayContaining(["language_code", "units", "followUp"]),
    );
    expect(draftSchema.properties).not.toHaveProperty("draft_units");
    expect(
      parseConnectorDraftUnit({
        question: "Will it rain tomorrow?",
      }),
    ).toEqual({ question: "Will it rain tomorrow?" });
    expect(() =>
      parseConnectorDraftUnit({
        question: "No question mark here",
      }),
    ).toThrow();
  });

  test("first drafts require at least three distinct selectable units", () => {
    const schema = z.object(
      foresightTools.submit_drafted_questions.inputSchema,
    );
    const unit = (question: string) => ({
      question,
    });
    const first = unit("Will the event happen by the deadline?");
    const second = unit("Will the event be confirmed by the deadline?");
    const third = unit("Will a reliable proxy indicate the event by then?");
    const payload = {
      language_code: "de",
      units: [first],
      followUp: "Which unit should we define next?",
    };

    expect(schema.safeParse(payload).success).toBe(false);
    expect(
      schema.safeParse({ ...payload, units: [first, second, third] }).success,
    ).toBe(true);
    expect(
      foresightTools.submit_drafted_questions.outputSchema.safeParse({
        ...payload,
        forecast_specification_id: "00000000-0000-4000-8000-000000000001",
        units: [first, second, third],
        expected_revision: "r1",
        prerequisite_revisions: {},
        workspace: {
          forecast_specification_id: "00000000-0000-4000-8000-000000000001",
          language_code: "de",
          revision: "r1",
          stage: "selected_unit",
          draft: { candidates: [], selected_candidate_id: null },
          approved: null,
          proposals: [],
          presentation: {
            title: "Forecast question",
            fields: [],
            validation_issues: [],
            actions: [],
          },
        },
        review_markdown: "# Forecast Specification\n\nDraft review",
      }).success,
    ).toBe(true);
    expect(
      foresightTools.submit_drafted_questions.outputSchema.safeParse({
        ...payload,
        forecast_specification_id: "00000000-0000-4000-8000-000000000001",
        language_code: undefined,
        units: [first, second, third],
        expected_revision: "r1",
        prerequisite_revisions: {},
        workspace: {
          forecast_specification_id: "00000000-0000-4000-8000-000000000001",
          language_code: "de",
          revision: "r1",
          stage: "selected_unit",
          draft: { candidates: [], selected_candidate_id: null },
          approved: null,
          proposals: [],
          presentation: {
            title: "Forecast question",
            fields: [],
            validation_issues: [],
            actions: [],
          },
        },
        review_markdown: "# Forecast Specification\n\nDraft review",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...payload, units: [first, first, second] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        units: [
          {
            questions: [
              "Will the event happen before the deadline?",
              "Will the event happen on or after the deadline?",
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("forecast approval stages put optional news after historical background", () => {
    expect(approvalStageSchema.options).toEqual([
      "selected_unit",
      "defined_terms",
      "resolution_sources",
      "resolution_criteria",
      "background_information",
      "news_timeline",
    ]);
    expect(Object.keys(foresightTools)).toHaveLength(16);
  });

  test("approval outputs carry a canonical review and handoff metadata at every stage", () => {
    const schema = foresightTools.approve_forecast_specification.outputSchema;
    const finalSummary = {
      expected_revision: "r1",
      prerequisite_revisions: {},
      forecast_specification_id: "00000000-0000-4000-8000-000000000001",
      language_code: "en",
      unit_number: 1,
      selected_unit: input.selected_unit,
      approved_stage: "background_information" as const,
      review_markdown: "# Forecast Specification\n\n## Stage: Complete",
    };

    expect(schema.safeParse(finalSummary).success).toBe(true);
    expect(
      schema.safeParse({
        ...finalSummary,
        forecast_specification_id: undefined,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        approved_stage: "background_information",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...finalSummary,
        approved_stage: "news_timeline",
        news_timeline: { items: [] },
      }).success,
    ).toBe(false);

    expect(
      schema.safeParse({
        ...finalSummary,
        approved_stage: "news_timeline",
      }).success,
    ).toBe(true);

    const criteriaApproval = {
      expected_revision: "r1",
      prerequisite_revisions: {},
      forecast_specification_id: "00000000-0000-4000-8000-000000000001",
      language_code: "de",
      unit_number: 1,
      selected_unit: input.selected_unit,
      approved_stage: "resolution_criteria" as const,
      review_markdown:
        "# Forecast Specification\n\n## Stage: Resolution Criteria Approved",
    };
    expect(schema.safeParse(criteriaApproval).success).toBe(true);
    expect(foresightServerInstructions).toContain(
      "Final approvals return this metadata in structured tool output",
    );
  });

  test("language code is a BCP 47 tag and canonicalized before storage", () => {
    expect(ForecastSpecificationLanguageCode.safeParse("de").success).toBe(
      true,
    );
    expect(ForecastSpecificationLanguageCode.safeParse("en-GB").success).toBe(
      true,
    );
    expect(ForecastSpecificationLanguageCode.safeParse("EN-us").success).toBe(
      true,
    );
    expect(ForecastSpecificationLanguageCode.safeParse("1-GB").success).toBe(
      true,
    );
    expect(() =>
      canonicalizeForecastSpecificationLanguageCode("1-GB"),
    ).toThrow();
    expect(canonicalizeForecastSpecificationLanguageCode("DE-de")).toBe(
      "de-DE",
    );
  });

  test("does not expose a forecast specification download tool", () => {
    expect(foresightTools).not.toHaveProperty(
      "download_approved_forecast_specification",
    );
  });

  test("workflow output instructions require canonical reviews and advance after intermediate approval", () => {
    expect(foresightServerInstructions).toContain(
      "Every successful workflow submission and approval returns `review_markdown`",
    );
    expect(foresightServerInstructions).toContain(
      "the\nauthoritative, complete user-facing result:",
    );
    expect(foresightServerInstructions).toContain(
      "Intermediate approval reviews after the question stage are never user-facing",
    );
    expect(foresightServerInstructions).toContain(
      "immediately invoke the next stage",
    );
    expect(foresightServerInstructions).toContain(
      "present\nonly that next stage's review",
    );
    expect(foresightServerInstructions).toContain(
      "Selection or editing alone does not approve content.",
    );
    expect(foresightServerInstructions).toContain("explicit Continue request");
    expect(foresightServerInstructions).toMatch(
      /copy the\s+complete\s+rendered Markdown exactly/,
    );
  });

  test("background information is plain text without subheadings or references", () => {
    const schema = z.object(
      foresightTools.submit_background_information.inputSchema,
    );
    const payload = {
      unit_number: 1,
      selected_unit: input.selected_unit,
      background_information: backgroundInformation,
      followUp: "Do you approve this context and background information?",
    };

    expect(schema.safeParse(payload).success).toBe(true);
    expect(ForecastBackgroundInformation.parse(backgroundInformation)).toEqual(
      backgroundInformation,
    );
    expect(
      ForecastBackgroundInformation.safeParse({
        background: backgroundInformation,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        background_information: {
          background: backgroundInformation,
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        background_information: {
          background: backgroundInformation,
          references: [
            {
              title: "Observatory weather information",
              publisher: "City Observatory",
              url: "https://observatory.example/weather",
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  test("news timeline requires unique item numbers and newest-to-oldest dates", () => {
    const item = {
      unit_number: 1,
      published_at: "2026-09-17T10:30:00+02:00",
      publisher: "Example News",
      url: "https://news.example/latest",
      summary: "The agency published its final decision today.",
    };
    const olderItem = {
      ...item,
      unit_number: 2,
      published_at: "2026-09-16",
      url: "https://news.example/earlier",
      summary: "The agency opened a public consultation.",
    };
    const timeline = { items: [item, olderItem] };
    const schema = z.object(foresightTools.submit_news_timeline.inputSchema);
    const payload = {
      unit_number: 1,
      selected_unit: input.selected_unit,
      news_timeline: timeline,
      followUp: "Which news item units are relevant?",
    };

    expect(ForecastNewsTimeline.parse(timeline)).toEqual(timeline);
    expect(ForecastNewsTimeline.parse({ items: [] })).toEqual({ items: [] });
    expect(schema.safeParse(payload).success).toBe(true);
    expect(
      schema.safeParse({
        ...payload,
        news_timeline: { items: [] },
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...payload,
        news_timeline: { items: [item, { ...olderItem, unit_number: 1 }] },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        news_timeline: { items: [olderItem, item] },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        news_timeline: {
          items: [
            item,
            {
              ...olderItem,
              unit_number: 3,
              published_at: "2026-09-17T11:00:00+02:00",
            },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        news_timeline: {
          items: [
            {
              ...item,
              published_at: "2026-09-17T00:15:00+14:00",
            },
            {
              ...olderItem,
              unit_number: 3,
              published_at: "2026-09-16T18:00:00-02:00",
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  test("resolution criteria use open question rules instead of closed criterion kinds or comparators", () => {
    const schema = z.object(
      foresightTools.submit_resolution_criteria.inputSchema,
    );
    const payload = {
      unit_number: 1,
      selected_unit: input.selected_unit,
      resolution_criteria: criteria,
      followUp: "Do these resolution criteria look right?",
    };

    expect(schema.safeParse(payload).success).toBe(true);
    expect(
      parseConnectorResolutionCriteria(criteria, input.selected_unit)
        .questionRule.question,
    ).toBe(input.selected_unit.question);

    const rankingCriteria = {
      ...criteria,
      questionRule: {
        question: input.selected_unit.question,
        resolvesYesWhen:
          "Resolve Yes when the approved source ranks the named item first after applying its own published tie-break procedure.",
        resolvesNoWhen:
          "Resolve No when the named item is not ranked first under that procedure.",
      },
    };
    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: rankingCriteria,
      }).success,
    ).toBe(true);

    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: {
          ...criteria,
          questionRule: undefined,
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: {
          criterion: {
            kind: "threshold",
            comparator: "greater-than",
          },
        },
      }).success,
    ).toBe(false);
  });

  test("one Yes/No rule covers scalar and categorical unit values", () => {
    const scalarUnit = {
      question: "Will the value be <range>?",
      variables: [
        {
          name: "range",
          values: ["below 10", "from 10 through 19", "at least 20"],
        },
      ],
    };
    const categoricalUnit = {
      question:
        "Which party will control the U.S. Senate after the 2026 election?",
      variables: [
        {
          name: "party",
          values: ["Democratic Party", "Republican Party"],
        },
      ],
    };
    const makeCriteria = (question: string) => ({
      questionRule: {
        question,
        resolvesYesWhen:
          "The approved public evidence satisfies the exact condition stated by this question.",
        resolvesNoWhen:
          "The approved public evidence establishes the complementary outcome or the Yes condition is not met by the deadline.",
      },
      evidenceAndSourceRules:
        "Use the highest-ranked approved source that publishes the facts needed by the applicable question rule.",
      exceptionAndUnresolvedRules:
        "Apply the stated range boundaries, source tie-breaking procedure, or template substitution as applicable; otherwise use the documented unresolved-outcome policy.",
    });

    for (const { unit, candidate } of [
      { unit: scalarUnit, candidate: makeCriteria(scalarUnit.question) },
      {
        unit: categoricalUnit,
        candidate: makeCriteria(categoricalUnit.question),
      },
    ]) {
      expect(
        parseConnectorResolutionCriteria(candidate, unit).questionRule,
      ).toMatchObject({ question: unit.question });
    }

    expect(() =>
      parseConnectorResolutionCriteria(
        {
          ...makeCriteria("Will the value be <range>?"),
          questionRule: {
            ...makeCriteria("Will the value be <range>?").questionRule,
            question: "Will another value be <range>?",
          },
        },
        scalarUnit,
      ),
    ).toThrow(
      "questionRule.question must exactly match selectedUnit.question.",
    );
    expect(() =>
      parseConnectorResolutionCriteria(
        makeCriteria("Will Candidate C win the election?"),
        categoricalUnit,
      ),
    ).toThrow(
      "questionRule.question must exactly match selectedUnit.question.",
    );
  });

  test("conditional criteria match the selected condition statement exactly", () => {
    const selectedUnit = {
      question: "Will Alice win the election?",
      condition: {
        statement: "Alice appears on the final ballot",
        ifUnmet: "annulled" as const,
      },
    };
    const conditionCriteria = {
      statement: selectedUnit.condition.statement,
      resolvesMetWhen: "The official ballot lists Alice.",
      resolvesUnmetWhen: "The final ballot does not list Alice.",
      evidenceAndSourceRules: "Use the election authority's final ballot.",
      exceptionAndUnresolvedRules:
        "If no final ballot is available, treat the condition as unresolved.",
    };
    const conditionalCriteria = {
      ...criteria,
      questionRule: {
        ...criteria.questionRule,
        question: selectedUnit.question,
      },
      conditionCriteria,
    };
    expect(
      parseConnectorResolutionCriteria(conditionalCriteria, selectedUnit)
        .conditionCriteria?.statement,
    ).toBe(selectedUnit.condition.statement);
    expect(() =>
      parseConnectorResolutionCriteria(criteria, selectedUnit),
    ).toThrow("Conditional units require conditionCriteria");
    expect(() =>
      parseConnectorResolutionCriteria(
        {
          ...conditionalCriteria,
          conditionCriteria: {
            ...conditionCriteria,
            statement: "Alice registers to run",
          },
        },
        selectedUnit,
      ),
    ).toThrow("must exactly match selectedUnit.condition.statement");
    expect(() =>
      parseConnectorResolutionCriteria(
        { ...criteria, conditionCriteria },
        input.selected_unit,
      ),
    ).toThrow("Unconditional units cannot have conditionCriteria");
  });

  test("resolution rule text can use concise or multi-sentence question-specific logic", () => {
    const conciseCriteria = {
      ...criteria,
      questionRule: {
        ...criteria.questionRule,
        resolvesNoWhen: "Otherwise resolve No.",
      },
      exceptionAndUnresolvedRules:
        "A tie uses the source's published tie-break. A cancellation follows the platform policy.",
    };

    const parsedConciseCriteria =
      parseConnectorResolutionCriteria(conciseCriteria);
    expect(
      "resolvesNoWhen" in parsedConciseCriteria.questionRule
        ? parsedConciseCriteria.questionRule.resolvesNoWhen
        : undefined,
    ).toBe("Otherwise resolve No.");
  });

  test("keeps shared and stage-specific guidance in one owner", () => {
    const criteriaSkill = readFileSync(
      new URL(
        "../../skills/define-resolution-criteria/SKILL.md",
        import.meta.url,
      ),
      "utf8",
    );
    const criteriaReference = readFileSync(
      new URL(
        "../../skills/define-resolution-criteria/references/criteria-spec.md",
        import.meta.url,
      ),
      "utf8",
    );

    expect(foresightServerInstructions).toContain(
      "Submission tools validate and store a pending stage.",
    );
    expect(foresightServerInstructions).toContain(
      "Pass the returned `forecast_specification_id` to every approval call",
    );
    expect(foresightServerInstructions).toContain("Show YAML in chat");
    expect(foresightServerInstructions).not.toContain("resolvesYesWhen");
    expect(foresightServerInstructions).not.toContain("current frontier");

    expect(criteriaSkill).toContain(
      "Read [references/criteria-spec.md](references/criteria-spec.md)",
    );
    expect(criteriaSkill).not.toContain("❓ **1 · <short title>**");
    expect(criteriaReference).toContain("entire current frontier");
    expect(criteriaReference).toContain("❓ **1 · <short title>**");
    expect(criteriaReference).toContain("`resolvesYesWhen`");
    expect(criteriaReference).toContain(
      "the failed submission changed nothing",
    );
  });

  test("keeps tool descriptions concise and delegates procedure to skills", () => {
    for (const tool of Object.values(foresightTools)) {
      expect(tool.description.length).toBeLessThanOrEqual(260);
      expect(tool.description).not.toContain("language_code");
      expect(tool.description).not.toContain("forecast_specification_id");
    }
  });

  test("plugin feedback is bounded and has a deletion receipt contract", () => {
    const promptInput = z.object(
      foresightTools.get_plugin_feedback_step.inputSchema,
    );
    expect(promptInput.safeParse({ step: "channels" }).success).toBe(true);
    expect(promptInput.safeParse({ step: "private_notice" }).success).toBe(
      true,
    );
    expect(promptInput.safeParse({ step: "other" }).success).toBe(false);
    expect(
      foresightTools.get_plugin_feedback_step.outputSchema.safeParse({
        step: "private_notice",
        review_markdown: "# Bleavit Foresight Feedback",
      }).success,
    ).toBe(true);
    const submitInput = z.object(
      foresightTools.submit_plugin_feedback.inputSchema,
    );
    const deleteInput = z.object(
      foresightTools.delete_plugin_feedback.inputSchema,
    );

    expect(
      Object.keys(foresightTools.submit_plugin_feedback.inputSchema),
    ).toEqual(["feedback"]);
    expect(
      Object.keys(foresightTools.delete_plugin_feedback.inputSchema),
    ).toEqual(["feedback_id"]);
    expect(submitInput.safeParse({ feedback: "Helpful plugin." }).success).toBe(
      true,
    );
    expect(submitInput.safeParse({ feedback: "   " }).success).toBe(false);
    expect(submitInput.safeParse({ feedback: "x".repeat(4001) }).success).toBe(
      false,
    );
    expect(
      foresightTools.submit_plugin_feedback.outputSchema.safeParse({
        feedback_id: "00000000-0000-4000-8000-000000000001",
        expires_at: "2027-04-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      deleteInput.safeParse({
        feedback_id: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
    expect(
      foresightTools.delete_plugin_feedback.outputSchema.safeParse({
        request_processed: true,
      }).success,
    ).toBe(true);
    expect(foresightServerInstructions).toContain(
      "5. Leave feedback about Bleavit Foresight",
    );
    expect(foresightServerInstructions).toContain(
      "`get_plugin_feedback_step` with `step: channels`",
    );
    expect(foresightServerInstructions).toContain(
      "`get_plugin_feedback_step` with\n`step: private_notice`",
    );
    expect(foresightServerInstructions).toContain("Do not attach");
    expect(foresightServerInstructions).toContain(
      "Do not attach conversation history",
    );
    expect(foresightServerInstructions.replace(/\s+/g, " ")).toContain(
      "a forecast specification ID",
    );
    expect(foresightServerInstructions).toContain(
      "prefilling the user's feedback",
    );
    const normalizedInstructions = foresightServerInstructions.replace(
      /\s+/g,
      " ",
    );
    const initialInvite = normalizedInstructions.indexOf(
      "5. Leave feedback about Bleavit Foresight",
    );
    const exportInvite = normalizedInstructions.indexOf(
      "After showing all requested YAML",
    );
    const finalInvite = normalizedInstructions.indexOf(
      "After the user explicitly confirms the displayed export is correct",
    );
    expect(initialInvite).toBeGreaterThanOrEqual(0);
    expect(exportInvite).toBeGreaterThan(initialInvite);
    expect(finalInvite).toBeGreaterThan(exportInvite);
    expect(foresightServerInstructions).toContain(
      "start another Forecast Specification",
    );
  });
});
