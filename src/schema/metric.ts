import { z } from "zod";
import { CnlSentence } from "./common";

/** A measured quantity with its unit and exact measurement method. */
export const Metric = z.object({
  name: z
    .string()
    .min(3)
    .describe("Exact name of the data point as the source publishes it"),
  unit: z.string().min(1),
  /** CNL sentence: where in the publication the number is read from. */
  extraction: CnlSentence.describe(
    "Exactly which table/field/series ID the value is read from",
  ),
  /**
   * Revision policy — the #1 cause of econ-data disputes. Pin whether the
   * first print, a snapshot at a stated time, or a final revision governs.
   */
  revisionPolicy: z.enum([
    "first-published-value",
    "value-as-of-observation-time",
    "final-revised-value",
  ]),
  /**
   * Number of decimal places the source publishes. Governs rounding for
   * threshold comparisons and fallback calculations.
   */
  precision: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe(
      "Decimal places published by the source; comparisons and fallback calculations round to this",
    ),
});

export type MetricT = z.infer<typeof Metric>;
