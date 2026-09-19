import { describe, expect, test } from "bun:test";
import { parseConnectorDraftUnit } from "../../src/foresight/connector-draft-unit";

describe("parseConnectorDraftUnit", () => {
  test("restores scalar template shape at the connector boundary", () => {
    const valid = {
      type: "template" as const,
      question:
        "Will the museum's dinosaur exhibition remain open through <date>?",
      variables: [{ name: "date", values: ["August 25", "September 30"] }],
    };
    expect(parseConnectorDraftUnit(valid)).toEqual(valid);

    expect(() =>
      parseConnectorDraftUnit({
        ...valid,
        variables: [],
      }),
    ).toThrow();
  });

  test("rejects duplicate template variable names", () => {
    expect(() =>
      parseConnectorDraftUnit({
        type: "template",
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
