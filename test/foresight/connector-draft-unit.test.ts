import { describe, expect, test } from "bun:test";
import { parseConnectorDraftUnit } from "../../src/foresight/connector-draft-unit";

describe("parseConnectorDraftUnit", () => {
  test("accepts variable-backed and standalone questions without a type tag", () => {
    const valid = {
      question:
        "Will the museum's dinosaur exhibition remain open through <date>?",
      variables: [{ name: "date", values: ["August 25", "September 30"] }],
    };
    expect(parseConnectorDraftUnit(valid)).toEqual(valid);

    expect(
      parseConnectorDraftUnit({
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
      parseConnectorDraftUnit({
        question: "Will <range> apply in <region>?",
        variables: [
          { name: "range", values: ["low", "high"] },
          { name: "range", values: ["north", "south"] },
          { name: "region", values: ["north", "south"] },
        ],
      }),
    ).toThrow("Variable names must be unique");
  });

  test("keeps the condition and its unmet disposition in one selectable unit", () => {
    const unit = {
      question: "Will <candidate> win the election?",
      variables: [{ name: "candidate", values: ["Alice", "Bob"] }],
      condition: {
        statement: "If <candidate> appears on the final ballot",
        ifUnmet: "annulled" as const,
      },
    };
    expect(parseConnectorDraftUnit(unit)).toEqual(unit);
    expect(() =>
      parseConnectorDraftUnit({
        ...unit,
        condition: {
          ...unit.condition,
          statement: "If <party> appears on the final ballot",
        },
      }),
    ).toThrow("Every question placeholder must have a same-named variable");
    expect(() =>
      parseConnectorDraftUnit({
        ...unit,
        condition: { ...unit.condition, ifUnmet: "unknown" as "annulled" },
      }),
    ).toThrow();
    expect(
      parseConnectorDraftUnit({
        ...unit,
        condition: {
          ...unit.condition,
          statement: "Will the candidate appear on the ballot?",
        },
      }).condition?.statement,
    ).toBe("Will the candidate appear on the ballot?");
    expect(() =>
      parseConnectorDraftUnit({
        question: "Which party will win the election?",
        variables: [
          { name: "party", values: ["Alice's party", "Bob's party"] },
        ],
        condition: {
          statement: "The election takes place",
          ifUnmet: "resolve-no",
        },
      }),
    ).toThrow("resolve-no requires a binary Yes/No outcome question");
  });
});
