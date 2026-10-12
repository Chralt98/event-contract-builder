import { describe, expect, test } from "bun:test";
import { parseConnectorForecastQuestionUnit } from "../../src/foresight/connector-forecast-question-unit";

describe("parseConnectorForecastQuestionUnit", () => {
  test("accepts variable-backed and standalone questions without a type tag", () => {
    const valid = {
      question:
        "Will the museum's dinosaur exhibition remain open through <date>?",
      variables: [{ name: "date", values: ["August 25", "September 30"] }],
    };
    expect(parseConnectorForecastQuestionUnit(valid)).toEqual(valid);

    expect(
      parseConnectorForecastQuestionUnit({
        question: "Will the observatory report rain tomorrow?",
        variables: [],
      }),
    ).toEqual({
      question: "Will the observatory report rain tomorrow?",
      variables: [],
    });
  });

  test("rejects duplicate template variable names", () => {
    expect(() =>
      parseConnectorForecastQuestionUnit({
        question: "Will <range> apply in <region>?",
        variables: [
          { name: "range", values: ["low", "high"] },
          { name: "range", values: ["north", "south"] },
          { name: "region", values: ["north", "south"] },
        ],
      }),
    ).toThrow("Variable names must be unique");
  });

  test("keeps the condition and its unmet disposition in one forecast question unit", () => {
    const unit = {
      question: "Will <candidate> win the election?",
      variables: [{ name: "candidate", values: ["Alice", "Bob"] }],
      condition: {
        statement: "If <candidate> appears on the final ballot",
        ifUnmet: "annulled" as const,
      },
    };
    expect(parseConnectorForecastQuestionUnit(unit)).toEqual(unit);
    const custom = {
      ...unit,
      condition: {
        ...unit.condition,
        ifUnmet: "custom" as const,
        customIfUnmet:
          "Resolve to the last traded price at 23:59 UTC on October 5, 2026",
      },
    };
    expect(parseConnectorForecastQuestionUnit(custom)).toEqual(custom);
    expect(() =>
      parseConnectorForecastQuestionUnit({
        ...unit,
        condition: {
          ...unit.condition,
          statement: "If <party> appears on the final ballot",
        },
      }),
    ).toThrow("Every question placeholder must have a same-named variable");
    expect(() =>
      parseConnectorForecastQuestionUnit({
        ...unit,
        condition: { ...unit.condition, ifUnmet: "unknown" as "annulled" },
      }),
    ).toThrow();
    expect(
      parseConnectorForecastQuestionUnit({
        ...unit,
        condition: {
          ...unit.condition,
          statement: "Will the candidate appear on the ballot?",
        },
      }).condition?.statement,
    ).toBe("Will the candidate appear on the ballot?");
  });

  test("requires categorical values to expand an individual Yes/No question", () => {
    const unit = {
      question: "Will <candidate> win the election?",
      variables: [{ name: "candidate", values: ["Alice", "Bob", "Carol"] }],
      condition: {
        statement: "The election takes place",
        ifUnmet: "resolve-no" as const,
      },
    };
    expect(parseConnectorForecastQuestionUnit(unit)).toEqual(unit);

    expect(() =>
      parseConnectorForecastQuestionUnit({
        ...unit,
        question: "Which candidate will win the election?",
        variables: [{ name: "candidate", values: ["Alice", "Bob", "Carol"] }],
      }),
    ).toThrow("Every variable must be used as a same-named placeholder");
  });
});
