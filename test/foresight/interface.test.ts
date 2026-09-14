import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  DataSource,
  approvalStageSchema,
  foresightTools,
  parseConnectorDraftUnit,
} from "../../src/foresight";
import { DataSource as EventContractDataSource } from "../../src/schema/resolution";

const source = {
  id: "agency-results",
  rank: 1,
  name: "Agency results",
  publisher: "Agency One",
  url: "https://one.example/results",
};
const input = {
  unit_number: 1,
  selected_unit: {
    type: "binary" as const,
    question: "Will it rain tomorrow?",
  },
  sources: [source],
  followUp: "Does this hierarchy look right?",
};

describe("public forecast interface", () => {
  test("simplified forecast sources do not weaken the full contract schema", () => {
    expect(DataSource.parse(source)).toEqual(source);
    expect(EventContractDataSource.safeParse(source).success).toBe(false);
    expect(Object.keys(DataSource.shape).sort()).toEqual(
      ["id", "rank", "name", "publisher", "url", "datasetId"].sort(),
    );
  });

  test("source schemas retain rank and duplicate validation", () => {
    const schema = z.object(
      foresightTools.submit_resolution_source.inputSchema,
    );
    expect(schema.safeParse(input).success).toBe(true);
    const fallback = {
      ...source,
      id: "agency-two",
      rank: 2,
      publisher: "Agency Two",
      url: "https://two.example/results",
    };
    expect(
      schema.safeParse({ ...input, sources: [fallback, source] }).success,
    ).toBe(true);
    for (const invalid of [
      [],
      [{ ...source, rank: 2 }],
      [source, { ...fallback, rank: 3 }],
      [source, { ...fallback, publisher: "Agency One, Inc." }],
      [source, { ...fallback, url: source.url + "/" }],
    ]) {
      expect(schema.safeParse({ ...input, sources: invalid }).success).toBe(
        false,
      );
    }
  });

  test("connector shape stays flat while runtime validates domain invariants", () => {
    const schema = z.toJSONSchema(
      z.object(foresightTools.submit_selected_unit.inputSchema),
    );
    const unit = schema.properties!.selected_unit!;
    expect(unit).not.toHaveProperty("oneOf");
    expect(() => parseConnectorDraftUnit({ type: "binary" })).toThrow();
    expect(() =>
      parseConnectorDraftUnit({
        type: "binary",
        question: "No question mark here",
      }),
    ).toThrow();
  });

  test("forecast approval stages exclude the removed timing stage", () => {
    expect(approvalStageSchema.options).toEqual([
      "selected_unit",
      "defined_terms",
      "resolution_sources",
    ]);
    expect(Object.keys(foresightTools)).toHaveLength(6);
  });
});
