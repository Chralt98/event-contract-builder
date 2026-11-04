import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  DataSource,
  SourceHierarchy,
  ResolutionCriteria,
  ForecastBackgroundInformation,
  ForecastNewsTimeline,
  approvalStageSchema,
  canonicalizeForecastSpecificationLanguageCode,
  ForecastSpecificationLanguageCode,
  foresightTools,
  parseConnectorResolutionCriteria,
  foresightServerInstructions,
  foresightDiscoveryInstructions,
  MAX_SOURCE_URLS,
} from "../../src/foresight";

const source = {
  id: "agency-results",
  rank: 1,
  name: "Agency One",
  urls: ["https://one.example/results"],
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
    expect(foresightDiscoveryInstructions).toContain(
      "prepare_forecast_specification_stage",
    );
    expect(
      foresightServerInstructions.startsWith(foresightDiscoveryInstructions),
    ).toBe(true);
    expect(foresightDiscoveryInstructions.length).toBeLessThan(
      foresightServerInstructions.length,
    );
  });

  test("chat workspace actions expose single-purpose draft and proposal tools", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const bindings = {
      forecast_specification_id: id,
      stage: "defined_terms",
      expected_revision: "stage-revision",
      prerequisite_revisions: {},
    };
    const draft = { stage: "defined_terms", definitions: [] };
    const prepared = {
      ...bindings,
      preparation_receipt: id,
      draft,
    };

    expect(
      foresightTools.propose_forecast_specification_stage_changes.inputSchema.safeParse(
        prepared,
      ).success,
    ).toBe(true);

    const proposal = { ...bindings, proposal_id: id };
    expect(
      foresightTools.discard_forecast_specification_stage_proposal.inputSchema.safeParse(
        proposal,
      ).success,
    ).toBe(true);
    const approvalSchema =
      foresightTools.approve_forecast_specification_stage_proposal.inputSchema;
    expect(approvalSchema.safeParse(proposal).success).toBe(false);
    expect(
      approvalSchema.safeParse({ ...proposal, approved_draft_json: "{}" })
        .success,
    ).toBe(true);

    expect(
      foresightTools.revalidate_unchanged_forecast_specification_stages.inputSchema.safeParse(
        {
          forecast_specification_id: id,
          stages: ["news_timeline"],
          rationale: "The saved timeline remains unchanged.",
        },
      ).success,
    ).toBe(true);
    expect(
      foresightTools.revalidate_unchanged_forecast_specification_stages.inputSchema.safeParse(
        {
          forecast_specification_id: id,
          stages: ["defined_terms", "resolution_criteria", "news_timeline"],
          rationale: "These stages remain unchanged and valid.",
        },
      ).success,
    ).toBe(true);
    expect(
      foresightTools.revalidate_unchanged_forecast_specification_stages.inputSchema.safeParse(
        {
          forecast_specification_id: id,
          stages: ["defined_terms", "defined_terms"],
          rationale: "Duplicate stages must be rejected.",
        },
      ).success,
    ).toBe(false);
    for (const name of [
      "propose_forecast_specification_stage_changes",
      "approve_forecast_specification_stage_proposal",
      "discard_forecast_specification_stage_proposal",
      "revalidate_unchanged_forecast_specification_stages",
    ] as const) {
      const tool = foresightTools[name];
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: expect.any(Boolean),
        openWorldHint: false,
      });
    }
  });

  test("forecast sources use the Foresight source schema", () => {
    expect(DataSource.parse(source)).toEqual(source);
    expect(Object.keys(DataSource.shape).sort()).toEqual(
      ["id", "rank", "name", "urls"].sort(),
    );
    expect(
      DataSource.parse({
        ...source,
        access: "private",
        evidence_relationship: "republished",
        basis_source_ids: ["agency-results"],
      }),
    ).toEqual(source);
  });

  test("source URL errors explain how to fix an invalid web address", () => {
    const invalid = DataSource.safeParse({ ...source, urls: ["not a link"] });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(invalid.error.issues[0]!.message).toBe(
        "Enter a complete HTTP or HTTPS web address, such as https://example.com/results.",
      );
    expect(
      DataSource.safeParse({ ...source, urls: ["ftp://one.example/results"] })
        .success,
    ).toBe(false);
    expect(
      DataSource.safeParse({ ...source, urls: ["https://ok.example", "bad"] })
        .success,
    ).toBe(false);
  });

  test("source schemas validate ranks and allow repeated source details", () => {
    const schema = z.object({
      sources: SourceHierarchy,
      condition_sources: z
        .union([SourceHierarchy, z.array(DataSource).length(0)])
        .optional(),
    });
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
      urls: ["https://two.example/results"],
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
            urls: source.urls,
          },
        ],
      }).success,
    ).toBe(true);
    const fourSources = Array.from({ length: 4 }, (_, index) => ({
      id: `agency-${index}`,
      rank: index + 1,
      name: `Agency ${index}`,
      urls: [`https://agency-${index}.example/results`],
    }));
    expect(schema.safeParse({ ...input, sources: fourSources }).success).toBe(
      true,
    );
    expect(schema.safeParse({ ...input, condition_sources: [] }).success).toBe(
      true,
    );
    const fiveSources = [
      ...fourSources,
      {
        id: "agency-4",
        rank: 5,
        name: "Agency 4",
        urls: ["https://agency-4.example/results"],
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

  test("fallbacks and private data sources need only a name and URL list", () => {
    const schema = z.object({
      sources: SourceHierarchy,
      condition_sources: z
        .union([SourceHierarchy, z.array(DataSource).length(0)])
        .optional(),
    });
    const mirror = {
      id: "mirror-feed",
      rank: 2,
      name: "Public Data Mirror",
      urls: ["https://mirror.example/series"],
    };
    expect(
      schema.safeParse({
        ...input,
        sources: [source, mirror],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...input,
        sources: [
          {
            id: "private-ledger",
            rank: 1,
            name: "Private household expense ledger",
            urls: [],
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("conditional sources use an independently validated hierarchy", () => {
    const schema = z.object({
      sources: SourceHierarchy,
      condition_sources: z
        .union([SourceHierarchy, z.array(DataSource).length(0)])
        .optional(),
    });
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
    const schema = z.object({
      sources: SourceHierarchy,
      condition_sources: z
        .union([SourceHierarchy, z.array(DataSource).length(0)])
        .optional(),
    });

    expect(DataSource.parse(accountSource)).toMatchObject({
      ...accountSource,
      urls: [],
    });
    expect(
      schema.safeParse({ ...input, sources: [accountSource] }).success,
    ).toBe(true);
  });

  test("sources can omit URLs and one source can use multiple locators", () => {
    const schema = z.object({
      sources: SourceHierarchy,
      condition_sources: z
        .union([SourceHierarchy, z.array(DataSource).length(0)])
        .optional(),
    });
    expect(
      schema.safeParse({
        ...input,
        sources: [
          {
            id: "private-ledger",
            rank: 1,
            name: "Private household expense ledger",
            urls: [],
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...input,
        sources: [
          {
            ...source,
            urls: [
              "https://data.example/series-a",
              "https://data.example/series-b",
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("a resolution source has a bounded list of locators", () => {
    const urls = Array.from(
      { length: MAX_SOURCE_URLS },
      (_, index) => `https://data.example/series-${index + 1}`,
    );
    expect(DataSource.safeParse({ ...source, urls }).success).toBe(true);
    expect(
      DataSource.safeParse({
        ...source,
        urls: [...urls, "https://data.example/extra"],
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

  test("model completion operations have separate schemas and risk hints", () => {
    expect(
      foresightTools.open_forecast_export.inputSchema.safeParse({
        kind: "reopen",
        forecast_specification_id: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
    expect(
      foresightTools.export_forecast_specification.inputSchema.safeParse({
        kind: "reopen",
        forecast_specification_id: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(false);
    expect(
      foresightTools.set_forecast_news_choice.annotations.destructiveHint,
    ).toBe(true);
    expect(
      foresightTools.create_question_workspace.annotations.destructiveHint,
    ).toBe(false);
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

  test("background information is plain text without subheadings or references", () => {
    const schema = z.object({
      background_information: ForecastBackgroundInformation,
    });
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
    const schema = z.object({ news_timeline: ForecastNewsTimeline });
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
    const schema = z.object({
      resolution_criteria: ResolutionCriteria.strict(),
    });
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
      "The proposal does not\nchange approved content.",
    );
    expect(foresightServerInstructions).toContain(
      "Pass the returned `forecast_specification_id` to every approval call",
    );
    expect(foresightServerInstructions).toContain("open_forecast_export");
    expect(foresightServerInstructions).toContain(
      "export_forecast_specification",
    );
    expect(foresightServerInstructions).not.toContain("resolvesYesWhen");
    expect(foresightServerInstructions).not.toContain("current frontier");
    expect(foresightServerInstructions).toContain(
      "resume_forecast_specification",
    );
    expect(foresightServerInstructions).not.toContain(
      "check_active_forecast_draft",
    );
    expect(foresightServerInstructions).toContain("one specification");
    expect(foresightServerInstructions).toContain(
      "Maintain one active draft and one question unit",
    );
    expect(foresightServerInstructions).toContain("new request aside");
    expect(foresightServerInstructions).toMatch(
      /preserve the\s+other stages and their data/,
    );
    expect(foresightServerInstructions).toMatch(
      /Never\s+submit a new forecast question under the old specification ID/,
    );
    expect(foresightServerInstructions).toMatch(
      /delete_forecast_draft[\s\S]*create_forecast_specification/,
    );
    expect(foresightServerInstructions).toContain(
      "do not silently create a replacement",
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
      /do not\s+open or fetch the\s+Criteria workspace/,
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
    expect(
      foresightTools.get_forecast_specification_stage_review.description,
    ).toContain("does not attach or open the MCP App UI");
    expect(
      foresightTools.continue_forecast_specification.description,
    ).toContain("prerequisites list upstream stages only");
    for (const [name, tool] of Object.entries(foresightTools)) {
      // These descriptions include the explicitly requested approval boundaries.
      const limit =
        name === "approve_forecast_specification_stage_proposal"
          ? 500
          : name === "propose_forecast_specification_stage_changes"
            ? 416
            : name === "revalidate_unchanged_forecast_specification_stages"
              ? 320
              : name === "discard_forecast_specification_stage_proposal"
                ? 280
                : 260;
      expect(tool.description.length).toBeLessThanOrEqual(limit);
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
