import { z } from "zod";
import { Slug } from "./common";

/** A resolution data source with availability characteristics. */
export const DataSource = z.object({
  id: Slug,
  rank: z
    .number()
    .int()
    .min(1)
    .describe("Hierarchy rank; 1 = highest-priority source, must be unique"),
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
  /** Series/dataset identifier if the publisher uses one (e.g. CUSR0000SA0). */
  datasetId: z.string().optional(),
});

export type DataSourceT = z.infer<typeof DataSource>;
