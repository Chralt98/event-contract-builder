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
  name: z.string().min(3),
  publisher: z.string().min(2).describe("Organization that produces the data"),
  url: z
    .url()
    .describe(
      "User-facing source locator: prefer a known durable event-specific results/data page; otherwise use the publisher's stable canonical results, data, or topic hub. Methodology and press-release pages are supporting references only.",
    ),
  /** Series/dataset identifier if the publisher uses one (e.g. CUSR0000SA0). */
  datasetId: z.string().optional(),
});

export type DataSourceT = z.infer<typeof DataSource>;
