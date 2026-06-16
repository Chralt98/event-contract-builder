import { z } from "zod";
import { COMPARATOR_PHRASES } from "../cnl-resolution-statement";
import { IsoDateTime, Slug, IanaTimezone } from "./common";

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

/** A measured quantity with its unit and exact measurement method. */
export const Metric = z.object({
  name: z
    .string()
    .min(3)
    .describe("Exact name of the data point as the source publishes it"),
  unit: z.string().min(1),
  /** CNL sentence: where in the publication the number is read from. */
  extraction: CnlSentence.describe(
    "Exactly which table/field/series ID the value is read from",
  ),
  /**
   * Revision policy — the #1 cause of econ-data disputes. Pin whether the
   * first print, a snapshot at a stated time, or a final revision governs.
   */
  revisionPolicy: z.enum([
    "first-published-value",
    "value-as-of-observation-time",
    "final-revised-value",
  ]),
});

/**
 * Threshold criterion: resolves by comparing a single measured `metric`
 * against `threshold` (and `thresholdUpper` for `between-inclusive`) using
 * `comparator`. The result is the YES/NO (or winning-side) decision for
 * payout types that settle on a numeric comparison, e.g. "CPI YoY is greater
 * than or equal to 3.0%".
 */
const ThresholdCriterion = z.object({
  kind: z.literal("threshold"),
  metric: Metric,
  comparator: z.enum([
    "greater-than",
    "greater-than-or-equal",
    "less-than",
    "less-than-or-equal",
    "equal-to",
    "between-inclusive",
  ]),
  threshold: z.number(),
  /** Required iff comparator is between-inclusive. */
  thresholdUpper: z.number().optional(),
});

/** Occurrence criterion: a discrete event happens (or not) within the window. */
const OccurrenceCriterion = z.object({
  kind: z.literal("occurrence"),
  comparator: z.enum(["occurs", "does-not-occur"]),
  /** CNL sentence defining the occurrence with zero discretion. */
  eventClause: CnlSentence,
  /** CNL sentence stating what observable evidence counts as the occurrence. */
  evidenceStandard: CnlSentence,
});

/**
 * Range-membership criterion: resolves by locating the measured `metric`
 * value within a ladder of contiguous ranges (defined on the payout); the
 * range containing the value wins. Used for threshold-range payouts where
 * the outcome is "which range did the value fall into" rather than a single
 * true/false comparison.
 */
const RangeMembershipCriterion = z.object({
  kind: z.literal("range-membership"),
  metric: Metric,
});

/**
 * Structured resolution criterion: the single decision rule that determines
 * a contract's outcome. Exactly one variant applies per `Resolution`,
 * selected by `kind`:
 *
 * - `threshold` — numeric comparison against one or two bounds.
 * - `occurrence` — whether a discrete event did or did not occur.
 * - `range-membership` — which contiguous range the metric falls into.
 *
 * `Resolution.canonicalStatement` is deterministically rendered from this
 * value (see `COMPARATOR_PHRASES` and the CNL renderer), so the criterion
 * and the human-readable prose can never diverge.
 */
export const Criterion = z
  .discriminatedUnion("kind", [
    ThresholdCriterion,
    OccurrenceCriterion,
    RangeMembershipCriterion,
  ])
  .describe(
    "Structured resolution criterion; canonicalStatement is rendered from this",
  );

/** A resolution data source with availability characteristics. */
export const DataSource = z.object({
  id: Slug,
  name: z.string().min(3),
  publisher: z.string().min(2).describe("Organization that produces the data"),
  url: z.url(),
  /** Series/dataset identifier if the publisher uses one (e.g. CUSR0000SA0). */
  datasetId: z.string().optional(),
  publicationSchedule: z
    .string()
    .min(10)
    .describe("When and how often the value is published"),
  /** Is the source free of paywalls/logins at resolution time? */
  publiclyAccessible: z.boolean(),
  /** Could a market participant influence this source? Feeds Core Principle 3. */
  independenceNote: z
    .string()
    .min(30)
    .describe("Publisher's independence from market participants"),
});

/** Ordered fallback with an enumerated trigger — no discretionary switching. */
export const Fallback = z.object({
  trigger: z.enum([
    "primary-not-published-by-deadline",
    "primary-discontinued",
    "primary-methodology-materially-changed",
    "primary-retracted-or-corrected",
  ]),
  sourceId: Slug.describe("id of a source in resolution.sources"),
  /** CNL sentence: how the value is read from the fallback. */
  procedure: CnlSentence,
});

/** What happens if even the fallbacks fail or the outcome is undefined. */
export const TerminalAmbiguityPolicy = z
  .enum([
    "resolve-no",
    "resolve-to-floor",
    "void-and-refund",
    "exchange-determination-per-rulebook",
  ])
  .describe(
    "Pre-committed disposition when no source/criterion can determine the outcome",
  );

export const Resolution = z
  .object({
    criterion: Criterion,
    /**
     * Deterministically rendered CNL sentence (see src/cnl.ts render()).
     * Stored redundantly so the YAML is self-contained for human reviewers;
     * the validator re-renders and compares.
     */
    canonicalStatement: CnlSentence,
    /** Reference period the metric/occurrence is measured over. */
    observationWindow: z.object({
      start: IsoDateTime,
      end: IsoDateTime,
      timezone: IanaTimezone.describe(
        "Governing timezone for any date words in CNL sentences",
      ),
    }),
    sources: z
      .array(DataSource)
      .min(1)
      .describe("All sources; first usable one per fallback order governs"),
    primarySourceId: Slug,
    fallbacks: z.array(Fallback).max(5).default([]),
    /** Hard deadline by which the contract MUST be resolved. */
    resolutionDeadline: IsoDateTime,
    /** May the contract resolve before the window ends if the outcome is locked? */
    earlyResolution: z.discriminatedUnion("allowed", [
      z.object({ allowed: z.literal(false) }),
      z.object({
        allowed: z.literal(true),
        condition: CnlSentence.describe(
          "CNL condition under which the outcome is irreversibly determined early",
        ),
      }),
    ]),
    terminalAmbiguityPolicy: TerminalAmbiguityPolicy,
    /**
     * Pre-adjudicated edge cases. Listing them up front is the single most
     * effective resolution-risk reducer: disputes become lookups.
     */
    edgeCases: z
      .array(
        z.object({
          scenario: CnlSentence,
          disposition: CnlSentence,
        }),
      )
      .min(3)
      .max(40)
      .describe(
        "At least 3 pre-decided edge cases (revisions, ties, postponements, source outages...)",
      ),
    /** Post-resolution dispute/review window before settlement is final. */
    disputeWindowHours: z.number().int().min(0).max(168),
  })
  .describe(
    "Complete resolution mechanics: criterion, sources, fallbacks, deadline, edge cases",
  )
  .superRefine((r, ctx) => {
    const ids = new Set(r.sources.map((s) => s.id));
    if (!ids.has(r.primarySourceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["primarySourceId"],
        message: "primarySourceId must match a source id",
      });
    }
    for (const [i, f] of r.fallbacks.entries()) {
      if (!ids.has(f.sourceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["fallbacks", i, "sourceId"],
          message: "fallback sourceId must match a source id",
        });
      }
    }
    if (r.criterion.kind === "threshold") {
      const hasUpper = r.criterion.thresholdUpper !== undefined;
      const needsUpper = r.criterion.comparator === "between-inclusive";
      if (needsUpper !== hasUpper) {
        ctx.addIssue({
          code: "custom",
          path: ["criterion", "thresholdUpper"],
          message:
            "thresholdUpper is required iff comparator is between-inclusive",
        });
      }
    }
    // Comparator phrase must literally appear in the canonical statement.
    const phrase =
      "comparator" in r.criterion
        ? COMPARATOR_PHRASES[r.criterion.comparator]
        : undefined;
    if (phrase && !r.canonicalStatement.includes(phrase)) {
      ctx.addIssue({
        code: "custom",
        path: ["canonicalStatement"],
        message: `canonicalStatement must contain the fixed CNL phrase "${phrase}"`,
      });
    }
  });
