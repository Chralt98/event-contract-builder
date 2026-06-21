import { z } from "zod";
import { Slug } from "./common";
import { Metric } from "./metric";

/* ---- Interval notation ---- */

export interface ParsedInterval {
  lowerBound: number | null;
  lowerInclusive: boolean;
  upperBound: number | null;
  upperInclusive: boolean;
}

const INTERVAL_RE =
  /^([\[\(])\s*(-inf|[+-]?\d+(?:\.\d+)?)\s*,\s*(\+inf|[+-]?\d+(?:\.\d+)?)\s*([\]\)])$/;

export function parseInterval(s: string): ParsedInterval | null {
  const m = s.trim().match(INTERVAL_RE);
  if (!m) return null;

  const lowerBound = m[2] === "-inf" ? null : Number(m[2]);
  const upperBound = m[3] === "+inf" ? null : Number(m[3]);
  const lowerInclusive = m[1] === "[";
  const upperInclusive = m[4] === "]";

  if (lowerBound === null && lowerInclusive) return null;
  if (upperBound === null && upperInclusive) return null;
  if (lowerBound !== null && upperBound !== null && lowerBound >= upperBound)
    return null;

  return { lowerBound, lowerInclusive, upperBound, upperInclusive };
}

export const RangeDefinition = z.object({
  id: Slug,
  label: z.string().min(1),
  interval: z
    .string()
    .regex(
      INTERVAL_RE,
      "Must be math interval notation, e.g. (-inf, 40.0) or [40.0, 45.0)",
    ),
});

export type RangeDefinitionT = z.infer<typeof RangeDefinition>;

/**
 * Range-membership criterion: a ladder of contiguous ranges over a metric.
 * Must be expanded into independent binary threshold contracts via
 * `expandRangeContracts()` before rendering or trading. Ranges must be
 * contiguous and exhaustive (first starts at -inf, last ends at +inf,
 * adjacent boundaries match with complementary brackets).
 */
export const RangeMembershipCriterion = z
  .object({
    kind: z.literal("range-membership"),
    metric: Metric,
    ranges: z.array(RangeDefinition).min(2),
  })
  .superRefine((c, ctx) => {
    const parsed: (ParsedInterval | null)[] = c.ranges.map((r, i) => {
      const p = parseInterval(r.interval);
      if (!p) {
        ctx.addIssue({
          code: "custom",
          path: ["ranges", i, "interval"],
          message: `Invalid interval: ${r.interval}`,
        });
      }
      return p;
    });

    if (parsed.some((p) => p === null)) return;
    const intervals = parsed as ParsedInterval[];

    const ids = new Set<string>();
    for (const [i, r] of c.ranges.entries()) {
      if (ids.has(r.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["ranges", i, "id"],
          message: `Duplicate range id: ${r.id}`,
        });
      }
      ids.add(r.id);
    }

    const first = intervals[0]!;
    const last = intervals[intervals.length - 1]!;

    if (first.lowerBound !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["ranges", 0, "interval"],
        message: "First range must start at -inf",
      });
    }

    if (last.upperBound !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["ranges", intervals.length - 1, "interval"],
        message: "Last range must end at +inf",
      });
    }

    for (let i = 0; i < intervals.length - 1; i++) {
      const cur = intervals[i]!;
      const next = intervals[i + 1]!;

      if (cur.upperBound !== next.lowerBound) {
        ctx.addIssue({
          code: "custom",
          path: ["ranges", i + 1, "interval"],
          message: `Boundary mismatch: previous upper (${cur.upperBound}) !== this lower (${next.lowerBound})`,
        });
        continue;
      }

      if (cur.upperInclusive === next.lowerInclusive) {
        const problem = cur.upperInclusive ? "overlap" : "gap";
        ctx.addIssue({
          code: "custom",
          path: ["ranges", i + 1, "interval"],
          message: `Adjacent brackets cause ${problem} at ${cur.upperBound}`,
        });
      }
    }
  });
