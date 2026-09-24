import { z } from "zod";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { sourceIndependenceError } from "./source-validation";

/** A concise source identity used for an alternative forecast specification suggestion. */
export const alternativeSourceIdentitySchema = z.object({
  name: z
    .string()
    .min(3)
    .describe(
      "Specific source identity, such as a results page, social media account, or data feed.",
    ),
  publisher: z
    .string()
    .min(2)
    .describe("Organization or platform publishing or providing the source."),
  url: z
    .url()
    .optional()
    .describe(
      "Optional direct URL for a web-addressable source. Omit when the source is identified by an account, feed, or other specific name.",
    ),
});

/**
 * A nearby or proxy display-question suggestion. It is a draft candidate, not
 * a selected unit and not a term-definition payload; its sources must
 * nevertheless be genuinely distinct before the suggestion is shown as a
 * two-source alternative.
 */
export const alternativeForecastSpecificationSchema = z.object({
  unit_number: z
    .number()
    .int()
    .min(1)
    .describe(
      "The 1-based unit number to use if the user selects this alternative and continues with define-terms.",
    ),
  display_question_unit: ConnectorDraftUnit.describe(
    "A newly drafted alternative question with optional variables. It is not selected yet; pass it as selected_unit to define-terms only after the user chooses it.",
  ),
  rationale: z
    .string()
    .min(20)
    .describe(
      "How this alternative preserves or improves the user's intent and whether it is a close reformulation, proxy, or better suggestion.",
    ),
  sources: z
    .array(alternativeSourceIdentitySchema)
    .min(
      2,
      "An alternative forecast specification must offer at least two sources.",
    )
    .superRefine((sources, ctx) => {
      const error = sourceIndependenceError(sources);
      if (error) ctx.addIssue({ code: "custom", message: error });
    })
    .describe(
      "At least two independent source agencies that can resolve the alternative forecast specification.",
    ),
});

export type AlternativeForecastSpecificationT = z.infer<
  typeof alternativeForecastSpecificationSchema
>;
