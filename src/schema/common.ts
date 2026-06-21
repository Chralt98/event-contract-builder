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

/**
 * Check that the UTC offset in an ISO datetime string matches
 * the IANA timezone at that instant. Returns an error message
 * or null if valid.
 */
export function checkTimezoneOffset(
  iso: string,
  timezone: string,
): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const statedOffset = iso.match(/(Z|[+-]\d{2}:\d{2})$/)?.[1];
  if (!statedOffset) return null;

  const statedMinutes =
    statedOffset === "Z"
      ? 0
      : (() => {
          const parts = statedOffset.split(":").map(Number);
          const h = parts[0] ?? 0;
          const m = parts[1] ?? 0;
          return h * 60 + (h < 0 ? -m : m);
        })();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const fmtParts = formatter.formatToParts(date);
  const tzPart = fmtParts.find((p) => p.type === "timeZoneName")?.value;
  if (!tzPart) return null;

  const expectedMinutes =
    tzPart === "GMT"
      ? 0
      : (() => {
          const match = tzPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
          if (!match) return null;
          const sign = match[1] === "+" ? 1 : -1;
          return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
        })();

  if (expectedMinutes !== null && statedMinutes !== expectedMinutes) {
    return `UTC offset does not match ${timezone} at this instant (stated ${statedOffset}, expected ${tzPart})`;
  }
  return null;
}

/** Stable machine identifier: lowercase kebab-case. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be lowercase kebab-case")
  .describe("Stable lowercase kebab-case identifier");

/**
 * CNL sentence: a single declarative English sentence in the controlled
 * vocabulary (see docs/cnl-grammar.md). Structural checks only — must start
 * with a capital letter, end with a period, and contain no hedging terms.
 */
export const CnlSentence = z
  .string()
  .min(20)
  .max(600)
  .regex(
    /^[A-Z].*\.$/s,
    "Must be a complete sentence (capitalized, ending in a period)",
  )
  .refine(
    (s) =>
      !/\b(approximately|roughly|about|around|reasonable|significant|materially|generally|etc\.?)\b/i.test(
        s,
      ),
    "CNL sentences must not contain hedging/vague terms (approximately, roughly, significant, etc.)",
  )
  .describe(
    "A single precise sentence in the controlled vocabulary; vague terms are rejected",
  );
