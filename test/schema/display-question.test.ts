import { describe, expect, test } from "bun:test";
import { DraftUnit } from "../../src/schema/display-question";

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

  test("requires variables to be represented by placeholders and a question mark", () => {
    expect(
      DraftUnit.safeParse({
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
});
