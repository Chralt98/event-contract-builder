import { z } from "zod";
import { sourceHierarchyRankError } from "./source-validation";
import { Slug } from "./common";

export const MAX_SOURCE_URLS = 12;
export const MAX_SOURCE_HIERARCHY_ENTRIES = 4;

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
      "Name of the organization, account, feed, private dataset, or composite calculation responsible for the source. For social accounts, include the platform to distinguish the account.",
    ),
  urls: z
    .array(
      z.httpUrl({
        error:
          "Enter a complete HTTP or HTTPS web address, such as https://example.com/results.",
      }),
    )
    .max(MAX_SOURCE_URLS)
    .default([])
    .describe(
      "URLs locating this source. List every input for a composite calculation; leave empty when none.",
    ),
});

export type DataSourceT = z.infer<typeof DataSource>;

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
    const rankError = sourceHierarchyRankError(sources);
    if (rankError) ctx.addIssue({ code: "custom", message: rankError });
  });
