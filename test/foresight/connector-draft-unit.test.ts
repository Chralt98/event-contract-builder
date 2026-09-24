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
    ).toThrow("Template variable names must be unique");
  });
});
