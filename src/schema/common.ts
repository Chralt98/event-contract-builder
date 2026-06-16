import { z } from "zod";

/** ISO 8601 calendar date, e.g. `2026-07-15`. */
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO 8601 date (YYYY-MM-DD)")
  .describe("ISO 8601 calendar date (YYYY-MM-DD)");

/**
 * ISO 8601 date-time **with explicit offset or Z**. Naive timestamps are
 * rejected because timezone ambiguity is a classic resolution-dispute vector.
 */
export const IsoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Must be ISO 8601 date-time with explicit offset (e.g. 2026-07-15T16:00:00-04:00)",
  )
  .describe("ISO 8601 date-time with mandatory UTC offset");

/** IANA timezone identifier, e.g. `America/New_York`. */
export const IanaTimezone = z
  .string()
  .regex(
    /^[A-Za-z]+\/[A-Za-z_+\-]+(\/[A-Za-z_+\-]+)?$|^UTC$/,
    "Must be an IANA timezone or UTC",
  )
  .describe("IANA timezone identifier (e.g. America/New_York) or UTC");

/** Stable machine identifier: lowercase kebab-case. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be lowercase kebab-case")
  .describe("Stable lowercase kebab-case identifier");
