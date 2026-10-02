import { describe, expect, test } from "bun:test";
// Exercise the live source entrypoint used by the npm package root.
import { DraftUnit, foresightTools, type DraftUnitT } from "../src";

describe("README package usage", () => {
  test("validates a Foresight draft and exposes its tool descriptor", () => {
    const draft: DraftUnitT = {
      question:
        "Will CPI year-over-year inflation exceed 3 percent in June 2027?",
    };

    expect(DraftUnit.parse(draft)).toEqual(draft);
    expect(foresightTools.submit_drafted_questions.title).toBe(
      "Submit Drafted Questions",
    );
  });
});
