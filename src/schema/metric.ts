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
});

export type MetricT = z.infer<typeof Metric>;
