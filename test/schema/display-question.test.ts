import { describe, expect, test } from "bun:test";
import { DraftUnit } from "../../src/schema/display-question";

const museumTemplate = {
  type: "template" as const,
  question: "Will the museum's dinosaur exhibition remain open through <date>?",
  variables: [
    {
      name: "date",
      values: ["August 25", "August 31", "September 15", "September 30"],
    },
  ],
};

describe("DraftUnit templates", () => {
  test("accepts a scalar template with finite values", () => {
    expect(DraftUnit.parse(museumTemplate)).toEqual(museumTemplate);
  });

  test("rejects an empty variable list", () => {
    expect(
      DraftUnit.safeParse({
        ...museumTemplate,
        variables: [],
      }).success,
    ).toBe(false);
  });

  test("requires a placeholder-bearing question ending in a question mark", () => {
    expect(
      DraftUnit.safeParse({
        type: "template",
        question: "Will the dinosaur exhibition remain open through August 31?",
        variables: [{ name: "date", values: ["August 31", "September 30"] }],
      }).success,
    ).toBe(false);
    expect(
      DraftUnit.safeParse({
        ...museumTemplate,
        question: museumTemplate.question.slice(0, -1),
      }).success,
    ).toBe(false);
  });

  test("requires template variables to match question placeholders", () => {
    expect(
      DraftUnit.safeParse({
        type: "template",
        question: "Which range applies: <range>?",
        variables: [{ name: "price", values: ["low", "high"] }],
      }),
    ).toMatchObject({
      success: false,
      error: {
        issues: [
          {
            message:
              "Template variables must match the question placeholders exactly (missing variables: range; undeclared variables: price)",
          },
        ],
      },
    });
  });

  test("allows a grammatical range slot with concrete range values", () => {
    expect(
      DraftUnit.safeParse({
        type: "template",
        question: "Will Bitcoin's BTC/USD price be <range> on January 19, 2027?",
        variables: [
          {
            name: "range",
            values: ["below $80,000", "$80,000 or more"],
          },
        ],
      }),
    ).toMatchObject({ success: true });
  });
});
