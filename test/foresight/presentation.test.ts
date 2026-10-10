import { expect, test } from "bun:test";
import { CompletionOutput } from "../../src/foresight";

test("completion keeps the Markdown export document without a chat review", () => {
  const output = CompletionOutput.parse({
    completion: {
      forecast_specification_id: crypto.randomUUID(),
      revision: "current",
      ready: true,
      complete: false,
      news_available: false,
      actions: [],
    },
    exports: [
      { format: "markdown", text: "Export content", revision: "current" },
    ],
  });
  expect(output.exports[0]!.text).toBe("Export content");
  expect(output).not.toHaveProperty("review_markdown");
  expect(
    CompletionOutput.safeParse({
      ...output,
      review_markdown: "Duplicate chat review",
    }).success,
  ).toBe(false);
});
