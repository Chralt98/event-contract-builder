import { describe, expect, test } from "bun:test";
// Exercise the live source entrypoint used by the npm package root.
import {
  ForecastQuestionUnit,
  foresightTools,
  type ForecastQuestionUnitT,
} from "../src";

describe("README package usage", () => {
  test("validates a Foresight draft and exposes its tool descriptor", () => {
    const draft: ForecastQuestionUnitT = {
      question:
        "Will CPI year-over-year inflation exceed 3 percent in June 2027?",
    };

    expect(ForecastQuestionUnit.parse(draft)).toEqual(draft);
    expect(foresightTools.submit_drafted_question.title).toBe(
      "Submit Drafted Question",
    );
  });
});
