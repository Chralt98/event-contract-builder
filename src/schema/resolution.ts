import { z } from "zod";
import { COMPARATOR_PHRASES } from "../cnl-resolution-statement";
import {
  IsoDateTime,
  Slug,
  IanaTimezone,
  CnlSentence,
  BoundaryRule,
  checkTimezoneOffset,
} from "./common";
import { ThresholdCriterion } from "./criterion-threshold";
import { OccurrenceCriterion } from "./criterion-occurrence";
import { RangeMembershipCriterion } from "./criterion-range-membership";
export { Metric } from "./metric";
export type { MetricT } from "./metric";
export { ThresholdCriterion } from "./criterion-threshold";
export { OccurrenceCriterion } from "./criterion-occurrence";
export {
  RangeMembershipCriterion,
  RangeDefinition,
  parseInterval,
  type ParsedInterval,
  type RangeDefinitionT,
} from "./criterion-range-membership";

/* -------------------------------------------------------------------------- */
/* §4 Resolution                                                              */
/* -------------------------------------------------------------------------- */

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
  /**
   * Explicit hierarchy rank; lower binds first. Ranks across all sources must
   * be unique and contiguous starting at 1 (see Resolution.superRefine), so the
   * source order is fixed pre-launch and never discretionary at settlement.
   */
  rank: z
    .number()
    .int()
    .min(1)
    .describe("Hierarchy rank; 1 = highest-priority source, must be unique"),
  /**
   * Which facts or features this source authoritatively establishes (e.g.
   * "legal enactment", "funding", "national scope"). Makes it explicit which
   * source governs which part of the resolution, not just the headline value.
   */
  controlsFor: z
    .array(z.string().min(3))
    .min(1)
    .max(12)
    .describe("Facts/features this source authoritatively establishes"),
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

/** Type of resolution authority — who has the power to determine the outcome. */
export const AuthorityType = z.enum([
  "administrator",
  "resolver",
  "expert-committee",
  "arbiter",
  "algorithm",
  "oracle-provider",
  "data-steward",
  "auditor",
  "court",
  "regulator",
  "mutually-agreed-expert",
]);

/** How the authority's determination is accessed. */
export const AuthorityAccessMethod = z.enum([
  "web",
  "api",
  "subscription",
  "private",
  "private-report",
  "specification",
  "manual-request",
  "public-record",
]);

/** A resolution authority — the entity that determines the outcome. */
export const ResolutionAuthority = z.object({
  id: Slug,
  rank: z
    .number()
    .int()
    .min(1)
    .describe("Hierarchy rank; 1 = primary authority, must be unique"),
  name: z.string().min(3),
  type: AuthorityType,
  accessMethod: AuthorityAccessMethod,
  notes: CnlSentence.describe(
    "How this authority determines the outcome and under what conditions",
  ),
});

/** Ordered authority fallback with an enumerated trigger. */
export const AuthorityFallback = z.object({
  trigger: z.enum([
    "primary-authority-unavailable",
    "primary-authority-conflicted",
    "primary-authority-determination-disputed",
    "primary-authority-disbanded-or-replaced",
    "higher-ranked-authorities-unavailable",
  ]),
  authorityId: Slug.describe("id of an authority in resolution.authorities"),
  procedure: CnlSentence,
});

/** Ordered source fallback with an enumerated trigger — no discretionary switching. */
export const Fallback = z.object({
  trigger: z.enum([
    "primary-not-published-by-deadline",
    "primary-discontinued",
    "primary-methodology-materially-changed",
    "primary-retracted-or-corrected",
    "primary-relocated-or-reorganized",
    "higher-ranked-sources-unavailable",
  ]),
  sourceId: Slug.describe("id of a source in resolution.sources"),
  /** CNL sentence: how the value is read from the fallback. */
  procedure: CnlSentence,
});

/** What happens if even the fallbacks fail or the outcome is undefined (invalid, ambigious). */
export const TerminalAmbiguityPolicy = z
  .enum([
    "resolve-yes",
    "resolve-no",
    "void-and-refund",
    "exchange-determination-per-rulebook",
  ])
  .describe(
    "Pre-committed disposition when no source/criterion can determine the outcome",
  );

export const CalculationMethodologyControls = z
  .object({
    /** How the settlement value is extracted or computed from the source data. */
    settlementCalculationProcedure: z
      .string()
      .min(50)
      .describe(
        "Exact procedure for deriving the settlement value from source data — table, field, formula, rounding rule",
      ),
    /** Is the methodology fully specified and locked before the contract begins trading? */
    methodologyLockedBeforeLaunch: z
      .boolean()
      .describe(
        "Whether the calculation methodology is fully specified and immutable before the first trading time",
      ),
    /** Disposition when methodology was not fully locked and the primary value is unavailable. Reuses TerminalAmbiguityPolicy values. */
    unspecifiedMethodologyDisposition: TerminalAmbiguityPolicy,
  })
  .describe(
    "Controls ensuring the settlement calculation methodology is transparent and locked pre-launch (Appendix C (c)(3))",
  );

export const FallbackControls = z
  .object({
    /** Is the fallback ordering immutable after launch? */
    orderingLockedAfterLaunch: z
      .boolean()
      .describe(
        "Whether the fallback source hierarchy may not be reordered after the contract begins trading",
      ),
    /** Are fallback computation procedures fully specified before launch? */
    fallbackComputationsSpecified: z
      .boolean()
      .describe(
        "Whether each fallback source's extraction procedure, query, and rounding rules are locked before launch",
      ),
    /** Disposition when a fallback is triggered but its computation was not pre-specified. Reuses TerminalAmbiguityPolicy values. */
    unspecifiedFallbackDisposition: TerminalAmbiguityPolicy,
  })
  .superRefine((f, ctx) => {
    if (
      !f.fallbackComputationsSpecified &&
      f.unspecifiedFallbackDisposition !== "void-and-refund"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["unspecifiedFallbackDisposition"],
        message:
          "when fallback computations are not pre-specified, void-and-refund is the safest disposition — document why a different choice was made if overriding",
      });
    }
  })
  .describe(
    "Controls ensuring fallback source ordering and methodology cannot be changed post-launch",
  );

export const ForceMajeure = z
  .object({
    /** Can the exchange halt trading during a force majeure event? */
    tradingHaltPermitted: z
      .boolean()
      .describe("Whether the exchange may halt trading during force majeure"),
    /** Can the resolution deadline be extended? */
    deadlineExtensionPermitted: z
      .boolean()
      .describe(
        "Whether the resolution deadline may be extended during force majeure",
      ),
    /** Maximum extension if permitted. */
    maxDeadlineExtensionDays: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Maximum calendar days the deadline may be extended"),
    /** What source substitutions are prohibited even during force majeure? */
    prohibitedSubstitutions: z
      .string()
      .min(30)
      .describe(
        "Sources or data types that may not be substituted even under force majeure — e.g. unranked sources, provisional data, discretionary metrics",
      ),
    /** Disposition if force majeure persists past any extended deadline. */
    ultimateDisposition: TerminalAmbiguityPolicy,
  })
  .superRefine((f, ctx) => {
    if (
      f.deadlineExtensionPermitted &&
      f.maxDeadlineExtensionDays === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxDeadlineExtensionDays"],
        message:
          "maxDeadlineExtensionDays is required when deadline extension is permitted",
      });
    }
  })
  .describe(
    "Force majeure provisions: what the exchange may and may not do when extraordinary events prevent normal operations (Core Principle 6)",
  );

export const MaterialityThresholds = z
  .object({
    /** CNL sentence: the minimum magnitude, scope, or quality an event must reach to count. */
    minimumQualifyingThreshold: CnlSentence.describe(
      "Minimum magnitude/scope an observed event must reach to qualify",
    ),
    /** Optional CNL sentence: how long a qualifying state must persist to count. */
    minimumDuration: CnlSentence.optional().describe(
      "Minimum duration a qualifying state must persist, if any",
    ),
    /**
     * Explicit floors that never qualify. Listing them up front converts
     * "was the event big/real enough?" disputes into lookups — the highest-value
     * resolution hardening for occurrence-style events.
     */
    deMinimisExclusions: z
      .array(CnlSentence)
      .min(1)
      .max(20)
      .describe("Events below these explicit floors never qualify"),
  })
  .describe(
    "How large/real an event must be to count, plus explicit de-minimis floors",
  );

export const Exclusions = z
  .object({
    /** Features whose presence disqualifies an action, regardless of anything else. */
    prohibitedFeatures: z
      .array(CnlSentence)
      .max(20)
      .default([])
      .describe(
        "Features whose presence disqualifies an otherwise-matching event",
      ),
    /** Concrete cases pre-decided as not qualifying. */
    nonQualifyingCases: z
      .array(CnlSentence)
      .min(1)
      .max(30)
      .describe("Concrete cases pre-decided as not qualifying"),
    /**
     * Substance-over-form rule: classify by actual legal/economic features, not
     * official name or label, so a qualifying outcome can't be manufactured by
     * relabeling (or dodged by renaming).
     */
    antiRebrandingRule: CnlSentence.describe(
      "Classify by substance, not official name or label",
    ),
  })
  .describe(
    "What never qualifies and the substance-over-form rule preventing relabeling",
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
      boundaryRule: BoundaryRule.describe(
        "How the observation window boundaries are applied (e.g. between-inclusive means both start and end instants count)",
      ),
    }),
    /** Who determines the outcome (distinct from where the data comes from). */
    authorities: z
      .array(ResolutionAuthority)
      .min(1)
      .describe("All authorities; rank-1 is the primary"),
    primaryAuthorityId: Slug,
    fallbackAuthorities: z.array(AuthorityFallback).max(5).default([]),
    sources: z
      .array(DataSource)
      .min(1)
      .describe("All sources; first usable one per fallback order governs"),
    primarySourceId: Slug,
    fallbackSources: z.array(Fallback).max(5).default([]),
    /** Checklist of public evidence that must exist before the contract can resolve to a qualifying outcome. */
    requiredPublicEvidence: z
      .array(CnlSentence)
      .min(1)
      .max(20)
      .describe("Public evidence that must exist for a qualifying resolution"),
    /** How official corrections, amendments, retractions, or revisions are treated relative to the deadline. */
    correctionOrRevisionPolicy: CnlSentence.describe(
      "How official corrections/revisions are handled relative to the deadline",
    ),
    /** How materially contradictory evidence across ranked sources is resolved. */
    conflictingEvidenceRule: CnlSentence.describe(
      "How contradictory evidence across ranked sources is resolved — typically hierarchy order, then indeterminate",
    ),
    /** How large/real the event must be to count (Appendix C materiality). */
    materiality: MaterialityThresholds,
    /** What never qualifies and the anti-rebranding (substance-over-form) rule. */
    exclusions: Exclusions,
    /** How the settlement value is computed and controls ensuring methodology is locked. */
    calculationMethodologyControls: CalculationMethodologyControls,
    /** Controls on fallback source ordering and methodology immutability. */
    fallbackControls: FallbackControls,
    /** Expected resolution time — when the outcome is planned to be determined. */
    scheduledResolutionTime: IsoDateTime,
    /** How the scheduled resolution time boundary is applied. */
    scheduledResolutionBoundaryRule: BoundaryRule.default("at").describe(
      "How the scheduled resolution time is interpreted (typically 'at')",
    ),
    /** Hard deadline by which the contract MUST be resolved. */
    resolutionDeadline: IsoDateTime,
    /** How the resolution deadline boundary is applied. */
    resolutionDeadlineBoundaryRule: BoundaryRule.default(
      "on-or-before",
    ).describe(
      "How the resolution deadline is interpreted (typically 'on-or-before')",
    ),
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
    /** Contract Outcome Review Process */
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
    /** What happens when extraordinary events prevent normal publication, trading, or settlement. */
    forceMajeure: ForceMajeure,
  })
  .describe(
    "Complete resolution mechanics: criterion, sources, fallbacks, deadline, edge cases",
  )
  .superRefine((r, ctx) => {
    if (r.scheduledResolutionTime > r.resolutionDeadline) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduledResolutionTime"],
        message:
          "scheduledResolutionTime must be at or before resolutionDeadline",
      });
    }
    const ids = new Set(r.sources.map((s) => s.id));
    if (!ids.has(r.primarySourceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["primarySourceId"],
        message: "primarySourceId must match a source id",
      });
    }
    // Source hierarchy ranks must be unique and contiguous from 1, so the
    // fallback order is fully determined pre-launch.
    const ranks = r.sources.map((s) => s.rank).sort((a, b) => a - b);
    const ranksValid = ranks.every((rank, i) => rank === i + 1);
    if (!ranksValid) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: `source ranks must be unique and contiguous from 1 (got ${ranks.join(", ")})`,
      });
    }
    // The primary source should be rank 1, so the headline source is unambiguous.
    const primary = r.sources.find((s) => s.id === r.primarySourceId);
    if (primary && primary.rank !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["primarySourceId"],
        message: "primarySourceId must be the rank-1 source",
      });
    }
    for (const [i, f] of r.fallbackSources.entries()) {
      if (!ids.has(f.sourceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["fallbackSources", i, "sourceId"],
          message: "fallback sourceId must match a source id",
        });
      }
    }
    // Authority ranks must be unique and contiguous from 1.
    const authIds = new Set(r.authorities.map((a) => a.id));
    if (!authIds.has(r.primaryAuthorityId)) {
      ctx.addIssue({
        code: "custom",
        path: ["primaryAuthorityId"],
        message: "primaryAuthorityId must match an authority id",
      });
    }
    const authRanks = r.authorities.map((a) => a.rank).sort((a, b) => a - b);
    const authRanksValid = authRanks.every((rank, i) => rank === i + 1);
    if (!authRanksValid) {
      ctx.addIssue({
        code: "custom",
        path: ["authorities"],
        message: `authority ranks must be unique and contiguous from 1 (got ${authRanks.join(", ")})`,
      });
    }
    const primaryAuth = r.authorities.find(
      (a) => a.id === r.primaryAuthorityId,
    );
    if (primaryAuth && primaryAuth.rank !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["primaryAuthorityId"],
        message: "primaryAuthorityId must be the rank-1 authority",
      });
    }
    for (const [i, f] of r.fallbackAuthorities.entries()) {
      if (!authIds.has(f.authorityId)) {
        ctx.addIssue({
          code: "custom",
          path: ["fallbackAuthorities", i, "authorityId"],
          message: "fallback authorityId must match an authority id",
        });
      }
    }
    if (r.criterion.kind === "threshold") {
      const hasUpper = r.criterion.thresholdUpper !== undefined;
      const needsUpper = r.criterion.comparator.startsWith("between-");
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
    const w = r.observationWindow;
    for (const field of ["start", "end"] as const) {
      const err = checkTimezoneOffset(w[field], w.timezone);
      if (err) {
        ctx.addIssue({
          code: "custom",
          path: ["observationWindow", field],
          message: err,
        });
      }
    }
  });

export type ResolutionAuthorityT = z.infer<typeof ResolutionAuthority>;
export type CalculationMethodologyControlsT = z.infer<
  typeof CalculationMethodologyControls
>;
export type FallbackControlsT = z.infer<typeof FallbackControls>;
export type ForceMajeureT = z.infer<typeof ForceMajeure>;
export type MaterialityThresholdsT = z.infer<typeof MaterialityThresholds>;
export type ExclusionsT = z.infer<typeof Exclusions>;
export type ResolutionT = z.infer<typeof Resolution>;
