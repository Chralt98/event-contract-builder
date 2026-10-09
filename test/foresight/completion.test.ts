import { expect, test } from "bun:test";
import { CompletionCommand } from "../../src/foresight/completion";

const id = crypto.randomUUID();
test("completion writes bind exports and confirmation to an explicit revision", () => {
  expect(
    CompletionCommand.safeParse({
      kind: "export",
      forecast_specification_id: id,
      formats: ["json"],
    }).success,
  ).toBe(false);
  expect(
    CompletionCommand.safeParse({
      kind: "confirm",
      forecast_specification_id: id,
    }).success,
  ).toBe(false);
  expect(
    CompletionCommand.safeParse({
      kind: "export",
      forecast_specification_id: id,
      expected_revision: "r1",
      formats: [],
    }).success,
  ).toBe(false);
  expect(
    CompletionCommand.parse({
      kind: "confirm",
      forecast_specification_id: id,
      displayed_revision: "r1",
    }).kind,
  ).toBe("confirm");
});
