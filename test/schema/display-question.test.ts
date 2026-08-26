import { describe, expect, test } from "bun:test";
import { DraftUnit } from "../../src/schema/display-question";

const bitcoinTemplate = {
  type: "template" as const,
  question: "Will Bitcoin's USD price be <comparator> <price> on <date>?",
  variables: [
    { name: "comparator", values: ["below", "at least"] },
    { name: "price", values: ["$60k", "$100k"] },
    { name: "date", values: ["November 26, 2026"] },
  ],
};

describe("DraftUnit template", () => {
  test("accepts a template with exactly one variable per placeholder", () => {
    expect(DraftUnit.parse(bitcoinTemplate)).toEqual(bitcoinTemplate);
    expect(
      DraftUnit.parse({
        type: "template",
        question:
          "Will the museum's dinosaur exhibition remain open through <date>?",
        variables: [
          {
            name: "date",
            values: [
              "August 25",
              "August 31",
              "September 15",
              "September 30",
              "October 31",
            ],
          },
        ],
      }).type,
    ).toBe("template");
  });

  test("rejects missing and undeclared variables", () => {
    const missing = {
      ...bitcoinTemplate,
      variables: bitcoinTemplate.variables.slice(0, 2),
    };
    const undeclared = {
      ...bitcoinTemplate,
      variables: [
        ...bitcoinTemplate.variables,
        { name: "exchange", values: ["Coinbase"] },
      ],
    };

    expect(DraftUnit.safeParse(missing).success).toBe(false);
    expect(DraftUnit.safeParse(undeclared).success).toBe(false);
  });

  test("rejects duplicate variable names and duplicate values", () => {
    const duplicateName = {
      ...bitcoinTemplate,
      variables: [
        ...bitcoinTemplate.variables,
        { name: "date", values: ["December 31, 2026"] },
      ],
    };
    const duplicateValue = {
      ...bitcoinTemplate,
      variables: bitcoinTemplate.variables.map((variable) =>
        variable.name === "price"
          ? { ...variable, values: ["$60k", "$60k"] }
          : variable,
      ),
    };

    expect(DraftUnit.safeParse(duplicateName).success).toBe(false);
    expect(DraftUnit.safeParse(duplicateValue).success).toBe(false);
  });

  test("requires a placeholder-bearing question ending in a question mark", () => {
    expect(
      DraftUnit.safeParse({
        type: "template",
        question: "Will the dinosaur exhibition remain open through August 31?",
        variables: [{ name: "date", values: ["August 31"] }],
      }).success,
    ).toBe(false);
    expect(
      DraftUnit.safeParse({
        ...bitcoinTemplate,
        question: bitcoinTemplate.question.slice(0, -1),
      }).success,
    ).toBe(false);
  });
});
