import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  DataSource,
  approvalStageSchema,
  foresightTools,
  parseConnectorResolutionCriteria,
  parseConnectorDraftUnit,
  foresightServerInstructions,
} from "../../src/foresight";
import { DataSource as EventContractDataSource } from "../../src/schema/resolution";

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
    type: "binary" as const,
    question: "Will it rain tomorrow?",
  },
  sources: [source],
  followUp: "Does this hierarchy look right?",
};

const criteria = {
  questionRules: [
    {
      question: input.selected_unit.question,
      resolvesYesWhen:
        "The approved source reports that measurable rainfall occurred before the question deadline.",
      resolvesNoWhen:
        "The approved source reports no measurable rainfall by the deadline, or the Yes condition is otherwise not met.",
    },
  ],
  evidenceAndSourceRules:
    "Use the highest-ranked approved source that publishes a result by the deadline. Apply an official correction published before resolution.",
  exceptionAndUnresolvedRules:
    "If no approved source can establish the result by the resolution deadline, apply the platform's documented unresolved-outcome policy.",
};

describe("public forecast interface", () => {
  test("simplified forecast sources do not weaken the full contract schema", () => {
    expect(DataSource.parse(source)).toEqual(source);
    expect(EventContractDataSource.safeParse(source).success).toBe(false);
    expect(Object.keys(DataSource.shape).sort()).toEqual(
      ["id", "rank", "name", "publisher", "url", "datasetId"].sort(),
    );
  });

  test("source schemas retain rank and duplicate validation", () => {
    const schema = z.object(
      foresightTools.submit_resolution_source.inputSchema,
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

  test("connector shape stays flat while runtime validates domain invariants", () => {
    const schema = z.toJSONSchema(
      z.object(foresightTools.submit_selected_unit.inputSchema),
    );
    const unit = schema.properties!.selected_unit!;
    expect(unit).not.toHaveProperty("oneOf");
    expect(() => parseConnectorDraftUnit({ type: "binary" })).toThrow();
    expect(() =>
      parseConnectorDraftUnit({
        type: "binary",
        question: "No question mark here",
      }),
    ).toThrow();
  });

  test("first drafts require at least three distinct selectable units", () => {
    const schema = z.object(
      foresightTools.submit_drafted_questions.inputSchema,
    );
    const unit = (question: string) => ({
      type: "binary" as const,
      question,
    });
    const first = unit("Will the event happen by the deadline?");
    const second = unit("Will the event be confirmed by the deadline?");
    const third = unit("Will a reliable proxy indicate the event by then?");
    const payload = {
      units: [first],
      followUp: "Which unit should we define next?",
    };

    expect(schema.safeParse(payload).success).toBe(false);
    expect(
      schema.safeParse({ ...payload, units: [first, second, third] }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...payload, units: [first, first, second] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...payload,
        units: [
          {
            type: "scalar" as const,
            questions: [
              "Will the event happen before the deadline?",
              "Will the event happen on or after the deadline?",
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("forecast approval stages include resolution criteria after sources", () => {
    expect(approvalStageSchema.options).toEqual([
      "selected_unit",
      "defined_terms",
      "resolution_sources",
      "resolution_criteria",
    ]);
    expect(Object.keys(foresightTools)).toHaveLength(7);
  });

  test("final approval requires the complete approved forecast specification", () => {
    const schema = foresightTools.approve_forecast_specification.outputSchema;
    const complete = {
      forecast_specification_id: "00000000-0000-4000-8000-000000000001",
      unit_number: 1,
      selected_unit: input.selected_unit,
      definitions: { deadline: "The stated resolution deadline." },
      resolution_sources: { sources: [source] },
      resolution_criteria: criteria,
      approved_stage: "resolution_criteria" as const,
    };

    expect(schema.safeParse(complete).success).toBe(true);
    for (const field of [
      "definitions",
      "resolution_sources",
      "resolution_criteria",
    ] as const) {
      const incomplete = { ...complete };
      delete incomplete[field];
      expect(schema.safeParse(incomplete).success).toBe(false);
    }
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
        .questionRules[0]?.question,
    ).toBe(input.selected_unit.question);

    const rankingCriteria = {
      ...criteria,
      questionRules: [
        {
          question: input.selected_unit.question,
          resolvesYesWhen:
            "Resolve Yes when the approved source ranks the named item first after applying its own published tie-break procedure.",
          resolvesNoWhen:
            "Resolve No when the named item is not ranked first under that procedure.",
        },
      ],
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
          questionRules: [...criteria.questionRules, ...criteria.questionRules],
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

  test("scalar, categorical, and template criteria cover their constituent binary questions", () => {
    const scalarUnit = {
      type: "scalar" as const,
      questions: [
        "Will the value be below 10?",
        "Will the value be from 10 through 19?",
        "Will the value be at least 20?",
      ],
    };
    const categoricalUnit = {
      type: "categorical" as const,
      questions: [
        "Will Candidate A win the election?",
        "Will Candidate B win the election?",
      ],
    };
    const templateUnit = {
      type: "template" as const,
      question: "Will <candidate> win the election?",
      variables: [
        { name: "candidate", values: ["Candidate A", "Candidate B"] },
      ],
    };
    const makeCriteria = (questions: string[]) => ({
      questionRules: questions.map((question) => ({
        question,
        resolvesYesWhen:
          "The approved public evidence satisfies the exact condition stated by this question.",
        resolvesNoWhen:
          "The approved public evidence establishes the complementary outcome or the Yes condition is not met by the deadline.",
      })),
      evidenceAndSourceRules:
        "Use the highest-ranked approved source that publishes the facts needed by the applicable question rule.",
      exceptionAndUnresolvedRules:
        "Apply the stated range boundaries, source tie-breaking procedure, or template substitution as applicable; otherwise use the documented unresolved-outcome policy.",
    });

    for (const { unit, questions } of [
      { unit: scalarUnit, questions: scalarUnit.questions },
      { unit: categoricalUnit, questions: categoricalUnit.questions },
      { unit: templateUnit, questions: [templateUnit.question] },
    ]) {
      const candidate = makeCriteria(questions);
      expect(
        parseConnectorResolutionCriteria(candidate, unit).questionRules,
      ).toHaveLength(questions.length);
    }

    expect(() =>
      parseConnectorResolutionCriteria(
        makeCriteria(scalarUnit.questions.slice(0, 2)),
        scalarUnit,
      ),
    ).toThrow("questionRules must cover the selected unit exactly");
    expect(() =>
      parseConnectorResolutionCriteria(
        makeCriteria([
          ...categoricalUnit.questions,
          "Will Candidate C win the election?",
        ]),
        categoricalUnit,
      ),
    ).toThrow("questionRules must cover the selected unit exactly");
  });

  test("resolution rule text can use concise or multi-sentence question-specific logic", () => {
    const conciseCriteria = {
      ...criteria,
      questionRules: criteria.questionRules.map((rule) => ({
        ...rule,
        resolvesNoWhen: "Otherwise resolve No.",
      })),
      exceptionAndUnresolvedRules:
        "A tie uses the source's published tie-break. A cancellation follows the platform policy.",
    };

    expect(
      parseConnectorResolutionCriteria(conciseCriteria).questionRules[0]
        ?.resolvesNoWhen,
    ).toBe("Otherwise resolve No.");
  });

  test("criteria workflow instructions enforce the grilling round protocol", () => {
    expect(foresightServerInstructions).toContain(
      "ask every currently answerable user-dependent decision as a separately numbered question",
    );
    expect(foresightServerInstructions).toContain("❓ **Qn** - **title**");
    expect(foresightServerInstructions).toContain(
      "Do not treat a list of recommendations or a combined confirmation as answered questions.",
    );
    expect(foresightServerInstructions).toContain(
      "no more than three distinct, reasonable substantive possibilities",
    );
    expect(foresightServerInstructions).toContain(
      "if none of the listed possibilities fits",
    );
    expect(foresightServerInstructions).toContain(
      "Treat that free-form answer as valid user input, not as a fourth listed option",
    );
    expect(foresightServerInstructions).toContain(
      "track the round count, and start every round with the current round number and the maximum expected number of grilling rounds",
    );
    expect(foresightServerInstructions).toContain(
      "of about <estimate> total (estimate)",
    );
    expect(foresightServerInstructions).toContain(
      "answer every question in the current round in one response",
    );
    expect(foresightServerInstructions).toContain(
      "explicitly accept or reject each recommendation",
    );
    expect(foresightServerInstructions).toContain(
      "obtain the user's explicit final confirmation",
    );
    expect(foresightServerInstructions).toContain(
      "make the complete grilling round the final user-visible response for that turn",
    );
    expect(foresightServerInstructions).toContain(
      "Never emit the round only as commentary",
    );
    expect(foresightServerInstructions).toContain(
      'follow it with a final response containing only a generic prompt such as "Please answer the questions."',
    );
    expect(foresightServerInstructions).toContain(
      "treat the submission as rejected before persistence",
    );
    expect(foresightServerInstructions).toContain(
      "show only the updated field and value that caused the error",
    );
    expect(foresightServerInstructions).toContain(
      "the existing forecast specification was not changed",
    );
    expect(foresightTools.submit_resolution_criteria.description).toContain(
      "only the corrected field and value",
    );
    expect(foresightServerInstructions).toContain(
      "Present the complete rendered Markdown returned by that approval call",
    );
    expect(foresightServerInstructions).toContain(
      "Do not summarize, truncate, or respond with only the approval status or forecast specification ID",
    );
    expect(foresightTools.approve_forecast_specification.description).toContain(
      "complete approved forecast specification",
    );
  });
});
