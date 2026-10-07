import { z } from "zod";
import {
  sourceHierarchyRankError,
  sourceIndependenceError,
} from "./source-validation";
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
      "Name of the organization, account, or feed responsible for the source; identify social accounts with their platform, such as Donald Trump (@realDonaldTrump) on X.",
    ),
  url: z
    .httpUrl({
      error:
        "Enter a complete HTTP or HTTPS web address, such as https://example.com/results.",
    })
    .optional()
    .describe(
      "Optional direct URL for a web-addressable source. Omit when the source is identified by an account, feed, or other specific name.",
    ),
});

export type DataSourceT = z.infer<typeof DataSource>;

export const MAX_SOURCE_HIERARCHY_ENTRIES = 4;

/** Shared approval validator for each outcome or condition hierarchy. */
export const SourceHierarchy = z
  .array(DataSource)
  .min(1, "At least one rank-1 primary source is required.")
  .max(
    MAX_SOURCE_HIERARCHY_ENTRIES,
    "A source hierarchy supports one primary source and up to three fallback sources.",
  )
  .superRefine((sources, ctx) => {
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
      ctx.addIssue({
        code: "custom",
        message: "Source IDs must be unique within a hierarchy.",
      });
    for (const message of [
      sourceHierarchyRankError(sources),
      sourceIndependenceError(sources),
    ])
      if (message) ctx.addIssue({ code: "custom", message });
  });
