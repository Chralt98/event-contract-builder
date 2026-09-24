import { z } from "zod";

/** User-facing context that helps readers understand a forecast specification. */
export const ForecastBackgroundInformation = z
  .string()
  .min(10)
  .describe(
    "Neutral, factual context and background information for an approved forecast specification, without a redundant subheading.",
  );

export type ForecastBackgroundInformationT = z.infer<
  typeof ForecastBackgroundInformation
>;
