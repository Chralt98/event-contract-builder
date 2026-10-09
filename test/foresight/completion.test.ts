import { expect, test } from "bun:test";
import {
  CompletionCommand,
  CompletionSnapshot,
} from "../../src/foresight/completion";

const id = crypto.randomUUID();
test("completion writes bind exports to an explicit revision", () => {
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
      displayed_revision: "r1",
    }).success,
  ).toBe(false);
  for (const kind of ["news", "confirm", "translate", "delete"]) {
    expect(
      CompletionSnapshot.safeParse({
        forecast_specification_id: id,
        revision: "r1",
        ready: true,
        complete: false,
        news_available: false,
        actions: [{ kind, label: kind, enabled: true }],
      }).success,
    ).toBe(false);
  }
  expect(
    CompletionCommand.safeParse({
      kind: "export",
      forecast_specification_id: id,
      expected_revision: "r1",
      formats: [],
    }).success,
  ).toBe(false);
});
