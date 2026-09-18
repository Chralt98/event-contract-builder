import { z } from "zod";

/** One concise, source-linked update in the optional forecast news timeline. */
export const ForecastNewsItem = z.object({
  unit_number: z
    .number()
    .int()
    .min(1)
    .describe(
      "Unique 1-based number used to select this news item for the forecast specification.",
    ),
  published_at: z
    .union([z.iso.date(), z.iso.datetime({ offset: true })])
    .describe(
      "Verified publication date, preferably an ISO 8601 date-time with its UTC offset; use a date without a time when the source does not establish the publication time.",
    ),
  publisher: z
    .string()
    .min(2)
    .describe("Publisher or source organization for this news item."),
  url: z.url().describe("Direct public URL to the source for this news item."),
  summary: z
    .string()
    .min(10)
    .max(1200)
    .describe(
      "Succinct, objective factual information that is highly relevant to the forecast and adds information not already covered by the background or older news items.",
    ),
});

export type ForecastNewsItemT = z.infer<typeof ForecastNewsItem>;

/**
 * A newest-to-oldest list of distinct, incremental, non-binding news updates.
 * The user can select items by their unique unit numbers.
 */
export const ForecastNewsTimeline = z
  .object({
    items: z
      .array(ForecastNewsItem)
      .max(12)
      .superRefine((items, ctx) => {
        const unitNumbers = items.map(({ unit_number }) => unit_number);
        if (new Set(unitNumbers).size !== unitNumbers.length) {
          ctx.addIssue({
            code: "custom",
            message: "News timeline unit numbers must be unique.",
          });
        }

        for (let index = 1; index < items.length; index += 1) {
          const newer = items[index - 1];
          const older = items[index];
          if (!newer || !older) continue;

          const newerDate = newer.published_at.slice(0, 10);
          const olderDate = older.published_at.slice(0, 10);
          const bothTimesKnown =
            newer.published_at.length > 10 && older.published_at.length > 10;
          const isOutOfOrder = bothTimesKnown
            ? Date.parse(newer.published_at) < Date.parse(older.published_at)
            : newerDate < olderDate;

          if (isOutOfOrder) {
            ctx.addIssue({
              code: "custom",
              path: ["items", index, "published_at"],
              message:
                "News timeline items must be ordered from the most recent publication to the oldest.",
            });
          }
        }
      })
      .describe(
        "Up to twelve highly relevant, non-redundant news items, ordered newest to oldest. Each item has a unique selectable unit number. An empty list is only for explicitly removing a previously approved timeline.",
      ),
  })
  .describe(
    "Optional, factual news context approved separately from historical background information. News items are informational only and do not alter resolution criteria or the approved resolution-source hierarchy.",
  );

export type ForecastNewsTimelineT = z.infer<typeof ForecastNewsTimeline>;
