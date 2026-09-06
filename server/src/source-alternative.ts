import { z } from "zod";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { sourceIndependenceError } from "./source-hierarchy";

/** A concise source identity used for an alternative-market suggestion. */
export const alternativeSourceIdentitySchema = z.object({
  name: z.string().min(3),
  publisher: z.string().min(2),
  url: z.url(),
});

/**
 * A nearby or proxy display-question suggestion. It is a draft candidate, not
 * a selected unit and not a term-definition payload; its sources must
 * nevertheless be genuinely distinct before the suggestion is shown as a
 * two-source alternative.
 */
export const alternativeMarketSchema = z.object({
  unit_number: z
    .number()
    .int()
    .min(1)
    .describe(
      "The 1-based unit number to use if the user selects this alternative and continues with define-terms.",
    ),
  display_question_unit: ConnectorDraftUnit.describe(
    "A newly drafted alternative display-question unit. It is not selected yet and must contain only the new market question(s), placeholders, variables, and allowed values; pass it as selected_unit to define-terms only after the user chooses it.",
  ),
  rationale: z
    .string()
    .min(20)
    .describe(
      "How this alternative preserves or improves the user's intent and whether it is a close reformulation, proxy, or better suggestion.",
    ),
  sources: z
    .array(alternativeSourceIdentitySchema)
    .min(2, "An alternative market must offer at least two sources.")
    .superRefine((sources, ctx) => {
      const error = sourceIndependenceError(sources);
      if (error) ctx.addIssue({ code: "custom", message: error });
    })
    .describe(
      "At least two independent source agencies that can resolve the alternative market.",
    ),
});

export type AlternativeMarketT = z.infer<typeof alternativeMarketSchema>;
