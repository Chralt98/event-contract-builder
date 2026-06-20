import { describe, expect, test } from "bun:test";
import { Outcome } from "../../src/schema/outcome";

describe("Outcome", () => {
  test("accepts a binary outcome with Yes/No values", () => {
    const result = Outcome.parse({
      type: "binary",
      values: ["Yes", "No"],
      yesDefinition: "The resolution criterion holds as stated in the canonical statement",
      noDefinition: "The resolution criterion does not hold",
    });
    expect(result.type).toBe("binary");
    expect(result.values).toEqual(["Yes", "No"]);
    expect(result.yesDefinition).toBeDefined();
    expect(result.noDefinition).toBeDefined();
  });

  test("rejects a non-binary type discriminator", () => {
    const result = Outcome.safeParse({
      type: "categorical",
      values: ["Yes", "No"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects values other than Yes/No", () => {
    const result = Outcome.safeParse({
      type: "binary",
      values: ["Maybe", "No"],
    });
    expect(result.success).toBe(false);
  });

  test("requires the values field", () => {
    const result = Outcome.safeParse({ type: "binary" });
    expect(result.success).toBe(false);
  });
});
