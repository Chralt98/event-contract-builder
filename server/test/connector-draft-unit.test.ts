import { describe, expect, test } from "bun:test";
import { parseConnectorDraftUnit } from "../src/connector-draft-unit";

describe("parseConnectorDraftUnit", () => {
  test("restores template placeholder invariants at the connector boundary", () => {
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
        variables: [{ name: "deadline", values: ["August 25"] }],
      }),
    ).toThrow();
  });
});
