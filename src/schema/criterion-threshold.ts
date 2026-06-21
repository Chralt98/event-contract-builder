import { z } from "zod";
import { Metric } from "./metric";

/**
 * Threshold criterion: resolves by comparing a single measured `metric`
 * against `threshold` (and `thresholdUpper` for `between-*`) using
 * `comparator`. The result is the YES/NO decision for payout types that
 * settle on a numeric comparison, e.g. "CPI YoY is greater than or equal
 * to 3.0%".
 */
export const ThresholdCriterion = z.object({
  kind: z.literal("threshold"),
  metric: Metric,
  comparator: z.enum([
    "greater-than",
    "greater-than-or-equal",
    "less-than",
    "less-than-or-equal",
    "equal-to",
    "between-inclusive",
    "between-inclusive-exclusive",
    "between-exclusive-inclusive",
    "between-exclusive",
  ]),
  threshold: z.number(),
  /** Required iff comparator starts with between-. */
  thresholdUpper: z.number().optional(),
});
