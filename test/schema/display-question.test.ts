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

describe("DraftUnit template", () => {
  test("accepts a template with exactly one variable per placeholder", () => {
    expect(DraftUnit.parse(museumTemplate)).toEqual(museumTemplate);
  });

  test("rejects missing and undeclared variables", () => {
    const missing = {
      ...museumTemplate,
      variables: [],
    };
    const undeclared = {
      ...museumTemplate,
      variables: [
        ...museumTemplate.variables,
        { name: "venue", values: ["City Museum"] },
      ],
    };

    expect(DraftUnit.safeParse(missing).success).toBe(false);
    expect(DraftUnit.safeParse(undeclared).success).toBe(false);
  });

  test("rejects duplicate variable names and duplicate values", () => {
    const duplicateName = {
      ...museumTemplate,
      variables: [
        ...museumTemplate.variables,
        { name: "date", values: ["December 31, 2026"] },
      ],
    };
    const duplicateValue = {
      ...museumTemplate,
      variables: museumTemplate.variables.map((variable) =>
        variable.name === "date"
          ? { ...variable, values: ["August 25", "August 25"] }
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
        ...museumTemplate,
        question: museumTemplate.question.slice(0, -1),
      }).success,
    ).toBe(false);
  });
});
