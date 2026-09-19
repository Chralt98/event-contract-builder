import { z } from "zod";

/** A non-binding reference supporting forecast context or background. */
export const BackgroundReference = z.object({
  title: z
    .string()
    .min(3)
    .describe("Human-readable title of the background reference."),
  publisher: z
    .string()
    .min(2)
    .describe("Publisher or source organization for the reference."),
  url: z
    .url()
    .describe(
      "Public URL supporting the context or background information. This is informational and is not a binding resolution source.",
    ),
});

export type BackgroundReferenceT = z.infer<typeof BackgroundReference>;

/** User-facing context that helps readers understand a forecast specification. */
export const ForecastBackgroundInformation = z
  .object({
    background: z
      .string()
      .min(10)
      .describe(
        "Relevant historical, institutional, or domain background needed to understand the forecast.",
      ),
    keyFactors: z
      .array(z.string().min(3))
      .min(1)
      .max(12)
      .describe(
        "The main observable factors that could affect the forecasted outcome, stated neutrally and without probability estimates.",
      ),
    references: z
      .array(BackgroundReference)
      .min(1)
      .max(12)
      .superRefine((references, ctx) => {
        const urls = references.map(({ url }) => url);
        if (new Set(urls).size !== urls.length) {
          ctx.addIssue({
            code: "custom",
            message: "Background reference URLs must be distinct.",
          });
        }
      })
      .optional()
      .describe(
        "Optional public references supporting the context and background. When provided, they are explanatory only and do not alter the approved resolution-source hierarchy.",
      ),
  })
  .describe(
    "Neutral, factual context and background information for an approved forecast specification. Public references are optional.",
  );

export type ForecastBackgroundInformationT = z.infer<
  typeof ForecastBackgroundInformation
>;
