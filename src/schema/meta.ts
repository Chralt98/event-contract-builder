import { z } from "zod";
import { IsoDate, Slug } from "./common";
import { ProductName } from "./product-name";

/** Document lifecycle status. Deliberately stops short of any filing status. */
export const DraftStatus = z
  .enum([
    "draft",
    "internal-review",
    "counsel-review",
    "ready-for-dcm-discussion",
  ])
  .describe(
    "Lifecycle status. There is intentionally no 'filed' or 'self-certified' value.",
  );

export const Meta = z
  .object({
    /** Exchange-style ticker for the contract, e.g. `CPI-26JUN-T3.0`. */
    ticker: z
      .string()
      .regex(/^[A-Z0-9][A-Z0-9.\-]{1,29}$/)
      .describe("Ticker, uppercase alphanumerics with . and -"),
    /** Series code if this contract belongs to a recurring series. */
    seriesCode: z
      .string()
      .regex(/^[A-Z0-9\-]{2,20}$/)
      .optional()
      .describe("Recurring series code, if any"),
    /** Structured trader-facing question; displayName is rendered from template slots. */
    productName: ProductName,
    /** Full human title shown to traders. */
    title: z.string().min(10).max(160),
    /** Short title for tickets/mobile, ≤ 50 chars. */
    shortTitle: z.string().max(50).optional(),
    /** Underlying domain; drives review heuristics, not legality. */
    category: z.enum([
      "economic-indicator",
      "monetary-policy",
      "weather-climate",
      "energy-commodities",
      "financial-markets",
      "science-technology",
      "public-health",
      "entertainment-awards",
      "sports-aggregate",
      "other",
    ]),
    tags: z.array(Slug).max(10).default([]),
    /** Semver of THIS document (not the DSL). Bump on any term change. */
    specVersion: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .describe("Semver of this contract document"),
    status: DraftStatus,
    /** ISO date the draft was last materially edited. */
    lastUpdated: IsoDate,
    authors: z.array(z.string().min(2)).min(1),
  })
  .describe("Identification and lifecycle metadata");
