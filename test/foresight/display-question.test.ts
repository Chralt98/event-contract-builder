import { describe, expect, test } from "bun:test";
import { DraftUnit } from "../../src/foresight/display-question";

const museumTemplate = {
  question: "Will the museum's dinosaur exhibition remain open through <date>?",
  variables: [
    {
      name: "date",
      values: ["August 25", "August 31", "September 15", "September 30"],
    },
  ],
};

describe("DraftUnit schema", () => {
  test("accepts a variable-backed question with finite values", () => {
    expect(DraftUnit.parse(museumTemplate)).toEqual(museumTemplate);
  });

  test("accepts a binary question with no variables", () => {
    expect(
      DraftUnit.safeParse({
        question: "Will the museum's dinosaur exhibition remain open?",
      }).success,
    ).toBe(true);
    expect(
      DraftUnit.safeParse({
        question: "Will the museum's dinosaur exhibition remain open?",
        variables: [],
      }).success,
    ).toBe(true);
  });

  test("requires every variable value to substitute into a placeholder", () => {
    expect(
      DraftUnit.safeParse({
        question:
          "Which party will control the U.S. Senate after the 2026 election?",
        variables: [
          {
            name: "party",
            values: ["Democratic Party", "Republican Party"],
          },
        ],
      }),
    ).toMatchObject({
      success: false,
      error: {
        issues: [
          {
            message:
              "Every variable must be used as a same-named placeholder in the question or condition (unused variables: party)",
          },
        ],
      },
    });
    expect(
      DraftUnit.safeParse({
        ...museumTemplate,
        question: museumTemplate.question.slice(0, -1),
      }).success,
    ).toBe(false);
  });

  test("caps variable groups at five and values per group at fifty", () => {
    const variable = (name: string) => ({
      name,
      values: ["A", "B"],
    });
    const question = (count: number) =>
      `Will ${Array.from({ length: count }, (_, index) => `<outcome${index}>`).join(", ")} occur by October 5, 2026?`;
    expect(
      DraftUnit.safeParse({
        question: question(5),
        variables: Array.from({ length: 5 }, (_, index) =>
          variable(`outcome${index}`),
        ),
      }).success,
    ).toBe(true);
    expect(
      DraftUnit.safeParse({
        question: question(6),
        variables: Array.from({ length: 6 }, (_, index) =>
          variable(`outcome${index}`),
        ),
      }).success,
    ).toBe(false);
    expect(
      DraftUnit.safeParse({
        question: "Will <outcome> occur by October 5, 2026?",
        variables: [
          {
            name: "outcome",
            values: Array.from({ length: 51 }, (_, i) => `v${i}`),
          },
        ],
      }).success,
    ).toBe(false);
  });

  test("requires every question placeholder to have a declared variable", () => {
    const result = DraftUnit.safeParse({
      question: "Which range applies: <range>?",
      variables: [{ name: "price", values: ["low", "high"] }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ message }) => message)).toContain(
        "Every question placeholder must have a same-named variable (missing variables: range)",
      );
    }
  });

  test("allows a grammatical range slot with concrete range values", () => {
    expect(
      DraftUnit.safeParse({
        question:
          "Will Bitcoin's BTC/USD price be <range> on January 19, 2027?",
        variables: [
          {
            name: "range",
            values: ["below $80,000", "$80,000 or more"],
          },
        ],
      }),
    ).toMatchObject({ success: true });
  });

  test("keeps multi-value placeholders as individual binary questions", () => {
    expect(
      DraftUnit.safeParse({
        question: "Will the price be <range>?",
        condition: {
          statement: "The exchange is open on <date>",
          ifUnmet: "resolve-50-50",
        },
        variables: [
          {
            name: "range",
            values: ["below $80,000", "$80,000 to $99,999", "$100,000 or more"],
          },
          { name: "date", values: ["May 1", "May 2", "May 3"] },
        ],
      }).success,
    ).toBe(true);
  });

  test("validates custom and 50-50 unmet dispositions", () => {
    const conditional = {
      question: "Will the observatory report rain tomorrow?",
      condition: {
        statement: "The observatory is open by noon",
        ifUnmet: "custom",
      },
    };
    const missingAction = DraftUnit.safeParse(conditional);
    expect(missingAction.success).toBe(false);
    if (!missingAction.success) {
      expect(missingAction.error.issues).toHaveLength(1);
      expect(missingAction.error.issues).toMatchObject([
        {
          path: ["condition", "customIfUnmet"],
          message: "Describe what happens when the condition is not met",
        },
      ]);
    }
    expect(
      DraftUnit.safeParse({
        ...conditional,
        condition: {
          ...conditional.condition,
          customIfUnmet:
            "Resolve to the last traded price at 23:59 UTC on October 5, 2026",
        },
      }).success,
    ).toBe(true);
    expect(
      DraftUnit.safeParse({
        ...conditional,
        condition: {
          statement: conditional.condition.statement,
          ifUnmet: "annulled",
          customIfUnmet: "A custom action that does not apply",
        },
      }).success,
    ).toBe(false);
    expect(
      DraftUnit.safeParse({
        question: "Will the observatory report rain tomorrow?",
        condition: {
          statement: "The observatory is open by noon",
          ifUnmet: "resolve-50-50",
        },
      }).success,
    ).toBe(true);
    expect(
      DraftUnit.safeParse({
        question: "Will <party> control the Senate?",
        variables: [{ name: "party", values: ["A", "B"] }],
        condition: {
          statement: "The election is held by November 3",
          ifUnmet: "resolve-50-50",
        },
      }).success,
    ).toBe(true);
  });
});
