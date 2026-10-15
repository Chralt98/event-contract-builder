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
  parseConnectorForecastQuestionUnit,
  foresightServerInstructions,
  foresightDiscoveryInstructions,
} from "../../src/foresight";

const source = {
  id: "agency-results",
  rank: 1,
  name: "Agency One",
  url: "https://one.example/results",
};
const input = {
  preparation_receipt: "00000000-0000-4000-8000-000000000001",
  expected_revision: "generation-base",
  prerequisite_revisions: {},
  unit_number: 1,
  forecast_question_unit: {
    question: "Will it rain tomorrow?",
  },
  sources: [source],
  followUp: "Does this hierarchy look right?",
};

const criteria = {
  criteria:
    "The approved source reports measurable rainfall for the target date by the deadline. Otherwise it resolves No; use the approved source hierarchy and document unresolved evidence.",
};

const backgroundInformation =
  "The local observatory publishes daily weather measurements for the surrounding area.";

describe("public forecast interface", () => {
  test("discovery routes to complete preparation within the plugin tool budget", () => {
    expect(
      new TextEncoder().encode(foresightDiscoveryInstructions).byteLength,
    ).toBeLessThan(600);
    expect(foresightDiscoveryInstructions).toContain("prepare_stage");
    expect(
      foresightServerInstructions.startsWith(foresightDiscoveryInstructions),
    ).toBe(true);
    expect(foresightDiscoveryInstructions.length).toBeLessThan(
      foresightServerInstructions.length,
    );
  });

  test("forecast sources use the Foresight source schema", () => {
    expect(DataSource.parse(source)).toEqual(source);
    expect(Object.keys(DataSource.shape).sort()).toEqual(
      ["id", "rank", "name", "url"].sort(),
    );
  });

  test("source URL errors explain how to fix an invalid web address", () => {
    const invalid = DataSource.safeParse({ ...source, url: "not a link" });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(invalid.error.issues[0]!.message).toBe(
        "Enter a complete HTTP or HTTPS web address, such as https://example.com/results.",
      );
    expect(
      DataSource.safeParse({ ...source, url: "ftp://one.example/results" })
        .success,
    ).toBe(false);
  });

  test("source schemas validate ranks and allow repeated source details", () => {
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
      name: "Agency Two",
      url: "https://two.example/results",
    };
    expect(
      schema.safeParse({ ...input, sources: [fallback, source] }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...input,
        sources: [
          source,
          {
            ...fallback,
            name: source.name,
            url: source.url,
          },
        ],
      }).success,
    ).toBe(true);
    const fourSources = Array.from({ length: 4 }, (_, index) => ({
      id: `agency-${index}`,
      rank: index + 1,
      name: `Agency ${index}`,
      url: `https://agency-${index}.example/results`,
    }));
    expect(schema.safeParse({ ...input, sources: fourSources }).success).toBe(
      true,
    );
    const fiveSources = [
      ...fourSources,
      {
        id: "agency-4",
        rank: 5,
        name: "Agency 4",
        url: "https://agency-4.example/results",
      },
    ];
    expect(schema.safeParse({ ...input, sources: fiveSources }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        ...input,
        forecast_question_unit: {
          question: "Will Alice win the election?",
          condition: {
            statement: "Alice appears on the final ballot",
            ifUnmet: "annulled",
          },
        },
        condition_sources: fiveSources,
      }).success,
    ).toBe(false);
    for (const invalid of [
      [],
      [{ ...source, rank: 2 }],
      [source, { ...fallback, rank: 3 }],
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
        forecast_question_unit: conditionalUnit,
        condition_sources: [source],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...input,
        forecast_question_unit: conditionalUnit,
        condition_sources: [{ ...source, rank: 2 }],
      }).success,
    ).toBe(false);
  });

  test("one source name can identify a social account and its platform", () => {
    const accountSource = {
      id: "example-social-account",
      rank: 1,
      name: "Official account on a social platform",
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
      z.object(foresightTools.submit_forecast_question_unit.inputSchema),
    );
    const draftSchema = z.toJSONSchema(
      z.object(foresightTools.submit_drafted_question.inputSchema),
    );
    const unit = schema.properties!.forecast_question_unit!;
    expect(unit).not.toHaveProperty("oneOf");
    expect(draftSchema.properties!.language_code).not.toHaveProperty("pattern");
    expect(draftSchema.required).toEqual(
      expect.arrayContaining(["language_code", "units", "followUp"]),
    );
    expect(draftSchema.properties).not.toHaveProperty("draft_units");
    expect(
      parseConnectorForecastQuestionUnit({
        question: "Will it rain tomorrow?",
      }),
    ).toEqual({ question: "Will it rain tomorrow?" });
    expect(() =>
      parseConnectorForecastQuestionUnit({
        question: "No question mark here",
      }),
    ).toThrow();
  });

  test("first drafts submit one App question and keep nearby ideas in chat", () => {
    const schema = z.object(foresightTools.submit_drafted_question.inputSchema);
    const unit = (question: string) => ({
      question,
    });
    const first = unit("Will the event happen by the deadline?");
    const second = unit("Will the event be confirmed by the deadline?");
    const third = unit("Will a reliable proxy indicate the event by then?");
    const payload = {
      preparation_receipt: input.preparation_receipt,
      language_code: "de",
      units: [first],
      followUp: "Does this question look right?",
    };

    expect(schema.safeParse(payload).success).toBe(true);
    expect(schema.safeParse({ ...payload, units: [] }).success).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        units: Array.from({ length: 6 }, (_, index) =>
          unit(`Will event ${index} happen before the deadline?`),
        ),
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...payload, units: [first, second, third] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        units: [
          first,
          second,
          third,
          unit("Will data source A report an outcome?"),
          unit("Will data source B report an outcome?"),
        ],
      }).success,
    ).toBe(false);
    expect(
      foresightTools.submit_drafted_question.outputSchema.safeParse({
        ...payload,
        forecast_specification_id: "00000000-0000-4000-8000-000000000001",
        units: [first],
        expected_revision: "r1",
        prerequisite_revisions: {},
        workspace: {
          forecast_specification_id: "00000000-0000-4000-8000-000000000001",
          language_code: "de",
          revision: "r1",
          stage: "forecast_question_unit",
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
      }).success,
    ).toBe(true);
    expect(
      foresightTools.submit_drafted_question.outputSchema.safeParse({
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
          stage: "forecast_question_unit",
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
      "forecast_question_unit",
      "defined_terms",
      "resolution_sources",
      "resolution_criteria",
      "background_information",
      "news_timeline",
    ]);
    expect(foresightTools.execute_completion_command).toBeDefined();
  });

  test("model advancement accepts only valid approve or continue actions", () => {
    const action = {
      contract_version: 1,
      command_id: "00000000-0000-4000-8000-000000000001",
      forecast_specification_id: "00000000-0000-4000-8000-000000000002",
      expected_revision: "revision-1",
      prerequisite_revisions: {},
      stage: "forecast_question_unit",
      kind: "approve_and_continue",
      next_stage: "defined_terms",
    };
    const schema = foresightTools.advance_forecast_specification.inputSchema;

    expect(schema.safeParse(action).success).toBe(true);
    expect(
      schema.safeParse({ ...action, next_stage: "resolution_sources" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...action, kind: "reopen", next_stage: undefined })
        .success,
    ).toBe(false);
  });

  test("approval outputs carry handoff metadata without a text review", () => {
    const schema = foresightTools.approve_forecast_specification.outputSchema;
    const finalSummary = {
      expected_revision: "r1",
      prerequisite_revisions: {},
      forecast_specification_id: "00000000-0000-4000-8000-000000000001",
      language_code: "en",
      unit_number: 1,
      forecast_question_unit: input.forecast_question_unit,
      approved_stage: "background_information" as const,
    };

    expect(schema.safeParse(finalSummary).success).toBe(true);
    expect(
      schema.safeParse({ ...finalSummary, review_markdown: "A text review" })
        .success,
    ).toBe(false);
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
      forecast_question_unit: input.forecast_question_unit,
      approved_stage: "resolution_criteria" as const,
    };
    expect(schema.safeParse(criteriaApproval).success).toBe(true);
    expect(foresightServerInstructions).toMatch(
      /Final approvals return this metadata in structured tool\s+output/,
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

  test("workflow instructions make impact reviews chat-confirmed and specification-wide", () => {
    expect(foresightServerInstructions).toContain(
      "The MCP App is the supported surface for complete workflow reviews",
    );
    expect(foresightServerInstructions).toMatch(
      /a client without MCP App support has\s+no text review fallback/,
    );
    expect(foresightServerInstructions).toContain("`revalidate_unchanged`");
    expect(foresightServerInstructions).toMatch(
      /Opening a stage never\s+starts a review automatically\./,
    );
    expect(foresightServerInstructions).toContain(
      "`decide_forecast_impact_review`",
    );
    expect(foresightServerInstructions).toMatch(
      /After a successful approval that changes approved content/,
    );
    expect(foresightServerInstructions).toMatch(
      /A pending review is a\s+signal to screen the other saved stages; it is not yet an offer to the user\./,
    );
    expect(foresightServerInstructions).toMatch(
      /If no concrete incompatibility is found, do not offer an impact\s+review\./,
    );
    expect(foresightServerInstructions).toMatch(
      /name the affected stages and briefly\s+describe what no longer matches/,
    );
    expect(foresightServerInstructions).toMatch(
      /uses `!` only when a\s+concrete proposal is available/,
    );
    expect(foresightServerInstructions).toMatch(
      /After\s+submitting generated content,\s+do not quote or summarize the submitted draft in\s+chat/,
    );
    expect(foresightServerInstructions).not.toContain("review_markdown");
    expect(foresightTools.execute_workspace_command.description).toContain(
      "For model-driven approval or continuation",
    );
    expect(foresightTools.advance_forecast_specification.description).toContain(
      "without attaching or opening the App UI",
    );
    expect(foresightTools.approve_forecast_specification.description).toContain(
      "without advancing",
    );
    expect(foresightServerInstructions).toMatch(
      /or repeat its reviews, draft fields,\s+validation messages, or available actions in chat/,
    );
  });

  test("background information is plain text without subheadings or references", () => {
    const schema = z.object(
      foresightTools.submit_background_information.inputSchema,
    );
    const payload = {
      preparation_receipt: input.preparation_receipt,
      unit_number: 1,
      forecast_question_unit: input.forecast_question_unit,
      expected_revision: "reviewed-revision",
      prerequisite_revisions: {},
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

  test("news timeline requires unique item numbers but permits user-selected date order", () => {
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
      preparation_receipt: input.preparation_receipt,
      unit_number: 1,
      forecast_question_unit: input.forecast_question_unit,
      expected_revision: "reviewed-revision",
      prerequisite_revisions: {},
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
    ).toBe(true);
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
    ).toBe(true);
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
    ).toBe(true);
  });

  test("resolution criteria accept one complete criteria text without a question field", () => {
    const schema = z.object(
      foresightTools.submit_resolution_criteria.inputSchema,
    );
    const payload = {
      preparation_receipt: input.preparation_receipt,
      unit_number: 1,
      forecast_question_unit: input.forecast_question_unit,
      expected_revision: "reviewed-revision",
      prerequisite_revisions: {},
      resolution_criteria: criteria,
      followUp: "Do these resolution criteria look right?",
    };

    expect(schema.safeParse(payload).success).toBe(true);
    expect(parseConnectorResolutionCriteria(criteria)).toEqual(criteria);
    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: {
          questionRule: { question: input.forecast_question_unit.question },
          evidenceAndSourceRules: "Old structured criteria",
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: {
          criteria: "",
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        resolution_criteria: {
          ...criteria,
          question: input.forecast_question_unit.question,
        },
      }).success,
    ).toBe(false);
  });

  test("one complete criteria text applies to every placeholder substitution", () => {
    const candidate = {
      criteria:
        "Resolve Yes when the approved evidence establishes the question's condition; otherwise No.",
    };
    expect(parseConnectorResolutionCriteria(candidate)).toEqual(candidate);
  });

  test("conditional criteria retain the approved unmet disposition", () => {
    const conditionalCriteria = {
      criteria:
        "Resolve Yes if Alice appears on the final ballot and wins, according to the election authority. Otherwise resolve No; if she is absent from the final ballot, annul.",
    };
    expect(parseConnectorResolutionCriteria(conditionalCriteria)).toEqual(
      conditionalCriteria,
    );
  });

  test("criteria text accepts concise or multi-sentence question-specific logic", () => {
    const candidate = {
      criteria:
        "Otherwise resolve No. A tie uses the source's published tie-break. A cancellation follows the approved disposition.",
    };
    expect(parseConnectorResolutionCriteria(candidate)).toEqual(candidate);
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
    const criteriaValidation = readFileSync(
      new URL(
        "../../skills/define-resolution-criteria/references/criteria-validation.md",
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
    expect(foresightServerInstructions).toContain("execute_completion_command");
    expect(foresightServerInstructions).not.toContain("resolvesYesWhen");
    expect(foresightServerInstructions).not.toContain("current frontier");
    expect(foresightServerInstructions).toContain(
      "check_active_forecast_draft` to check whether an active draft exists",
    );
    expect(foresightServerInstructions).toContain(
      "does not read saved archives",
    );
    expect(foresightServerInstructions).toContain(
      "Wait for an explicit choice before creating or deleting",
    );

    expect(criteriaSkill).toContain(
      "Read [references/criteria-spec.md](references/criteria-spec.md)",
    );
    expect(criteriaSkill).toContain(
      "[references/criteria-validation.md](references/criteria-validation.md)",
    );
    expect(criteriaSkill).not.toContain("❓ **1 · <short title>**");
    expect(criteriaReference).toContain("request_user_input_async");
    expect(criteriaReference).toMatch(
      /do not open or fetch the\s+Criteria workspace/,
    );
    expect(criteriaReference).toContain("single editable");
    expect(criteriaReference).toContain(
      "outcome rules, approved resolution sources",
    );
    expect(criteriaReference).toContain(
      "[criteria-validation.md](criteria-validation.md)",
    );
    expect(criteriaValidation).toContain(
      "State the approved deadline as a concrete date",
    );
    expect(criteriaValidation).toContain("Name every approved fallback");
    expect(criteriaReference).toMatch(
      /the failed submission changed\s+nothing/,
    );
  });

  test("keeps tool descriptions concise and delegates procedure to skills", () => {
    expect(foresightTools.get_forecast_stage_review.description).toContain(
      "does not attach or open the MCP App UI",
    );
    expect(foresightTools.create_question_workspace.description).toContain(
      "Check for an active draft first",
    );
    expect(foresightTools.submit_drafted_question.description).toContain(
      "confirm any active draft's replacement first",
    );
    for (const tool of Object.values(foresightTools)) {
      expect(tool.description.length).toBeLessThanOrEqual(260);
      expect(tool.description).not.toContain("language_code");
      expect(tool.description).not.toContain("forecast_specification_id");
    }
  });

  test("keeps every tool schema representable as JSON Schema", () => {
    for (const tool of Object.values(foresightTools)) {
      const input =
        tool.inputSchema instanceof z.ZodType
          ? tool.inputSchema
          : z.object(tool.inputSchema);
      expect(() =>
        z.toJSONSchema(input, { target: "draft-2020-12", io: "input" }),
      ).not.toThrow();
      expect(() =>
        z.toJSONSchema(tool.outputSchema, {
          target: "draft-2020-12",
          io: "output",
        }),
      ).not.toThrow();
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
      }).success,
    ).toBe(true);
    expect(
      foresightTools.get_plugin_feedback_step.outputSchema.safeParse({
        step: "private_notice",
        review_markdown: "# Bleavit Foresight Feedback",
      }).success,
    ).toBe(false);
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
    expect(foresightServerInstructions).toContain("Feedback remains");
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
    expect(normalizedInstructions).toContain(
      "Exporting saves the displayed approved revision as complete",
    );
    expect(normalizedInstructions).not.toContain("kind: confirm");
    expect(normalizedInstructions).toContain(
      "without carrying over its predecessor's ID or approvals",
    );
  });
});
