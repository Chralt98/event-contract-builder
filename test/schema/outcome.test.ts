import { describe, expect, test } from "bun:test";
import { OutcomeSchema } from "../../src/schema/outcome";

describe("OutcomeSchema", () => {
  test("accepts a binary outcome with Yes/No values", () => {
    const result = OutcomeSchema.parse({
      type: "binary",
      values: ["Yes", "No"],
    });
    expect(result.type).toBe("binary");
    expect(result.values).toEqual(["Yes", "No"]);
  });

  test("rejects a non-binary type discriminator", () => {
    const result = OutcomeSchema.safeParse({
      type: "categorical",
      values: ["Yes", "No"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects values other than Yes/No", () => {
    const result = OutcomeSchema.safeParse({
      type: "binary",
      values: ["Maybe", "No"],
    });
    expect(result.success).toBe(false);
  });

  test("requires the values field", () => {
    const result = OutcomeSchema.safeParse({ type: "binary" });
    expect(result.success).toBe(false);
  });
});
