import { z } from "zod";
import { CnlSentence } from "./common";

/** Occurrence criterion: a discrete event happens (or not) within the window. */
export const OccurrenceCriterion = z.object({
  kind: z.literal("occurrence"),
  comparator: z.enum(["occurs", "does-not-occur"]),
  /** CNL sentence defining the occurrence with zero discretion. */
  eventClause: CnlSentence,
  /** CNL sentence stating what observable evidence counts as the occurrence. */
  evidenceStandard: CnlSentence,
});
