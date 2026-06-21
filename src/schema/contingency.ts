import { z } from "zod";
import { CnlSentence, IsoDateTime, Slug } from "./common";

/* -------------------------------------------------------------------------- */
/* §8 Contingency (conditional markets) — optional                            */
/* -------------------------------------------------------------------------- */

/** Pre-committed disposition when the contingency is not met. */
export const ContingencyUnmetDisposition = z
  .enum([
    "void-and-refund",
    "resolve-no",
    "exchange-determination-per-rulebook",
  ])
  .describe(
    "What happens to the contract if the contingency fails (no discretion at settlement time)",
  );

/** Taxonomy for structured criteria on contingency condition states. */
export const ContingencyCriterionType = z.enum([
  "legal-enactment",
  "appropriated-funding",
  "agency-designation",
  "geographic-scope",
  "publication-deadline",
  "implementation-mechanism",
  "empirical-method",
  "timing-exclusion",
  "evidence-gap",
  "other",
]);

/** One structured criterion within a condition state (required or disqualifying). */
export const ContingencyCriterion = z.object({
  criterionId: Slug,
  criterionType: ContingencyCriterionType,
  statement: CnlSentence,
  /** Optional pointer to a ranked evidence source in contingencyEvidence. */
  evidenceSourceRef: Slug.optional(),
});

/**
 * One contingency condition. The clause and evidence standard are CNL
 * sentences naming concrete observables, and each condition carries its own
 * evaluation deadline so "did the condition hold?" is itself dispute-proof.
 */
export const ContingencyCondition = z.object({
  id: Slug,
  /** CNL sentence stating the condition with zero discretion. */
  clause: CnlSentence,
  /** CNL sentence stating what observable evidence establishes the condition. */
  evidenceStandard: CnlSentence,
  /** Deadline by which the condition must hold (or be evaluable). */
  evaluationDeadline: IsoDateTime,
});

/**
 * One condition state within a contingency. Each state carries structured
 * required and disqualifying criteria, replacing prose adopted_if /
 * prohibited_features lists with machine-readable criterion objects.
 */
export const ContingencyConditionState = z.object({
  stateId: Slug,
  stateLabel: z.string().min(3).max(120),
  /** Structured criteria that must all be satisfied for this state to obtain. */
  requiredCriteria: z
    .array(ContingencyCriterion)
    .min(1)
    .max(30)
    .describe("All criteria that must hold for this state"),
  /** Criteria whose satisfaction disqualifies this state. */
  disqualifyingCriteria: z
    .array(ContingencyCriterion)
    .max(20)
    .default([])
    .describe("Criteria that disqualify this state if satisfied"),
});

/** Rules governing how contingency states are resolved. */
export const ContingencyStateResolutionRules = z
  .object({
    mutuallyExclusive: z.boolean(),
    collectivelyExhaustiveExcludingIndeterminate: z.boolean(),
    tradableStates: z
      .array(Slug)
      .min(1)
      .describe("State ids that can be traded; excludes indeterminate"),
    indeterminateState: Slug.describe(
      "State id for the indeterminate/catch-all outcome",
    ),
    defaultState: Slug.optional().describe(
      "Default state when no action qualifies (e.g. no-qualifying-action)",
    ),
    tieBreakRuleRef: z
      .string()
      .optional()
      .describe("Reference to a tie-break rule, or null if none"),
  })
  .superRefine((r, ctx) => {
    if (r.tradableStates.includes(r.indeterminateState)) {
      ctx.addIssue({
        code: "custom",
        path: ["indeterminateState"],
        message: "indeterminateState must not be in tradableStates",
      });
    }
    const stateIds = new Set(r.tradableStates);
    if (stateIds.size !== r.tradableStates.length) {
      ctx.addIssue({
        code: "custom",
        path: ["tradableStates"],
        message: "tradableStates must not contain duplicates",
      });
    }
    if (r.defaultState && !stateIds.has(r.defaultState)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultState"],
        message: "defaultState must be one of the tradableStates",
      });
    }
  })
  .describe("Rules for resolving contingency condition states");

/** A source in the contingency-specific evidence hierarchy. */
export const ContingencyEvidenceSource = z.object({
  id: Slug,
  rank: z
    .number()
    .int()
    .min(1)
    .describe("Hierarchy rank within contingency evidence"),
  name: z.string().min(3),
  sourceType: z
    .string()
    .min(3)
    .describe("E.g. official_legislative_record, official_agency_record"),
  controlsFor: z
    .array(z.string().min(3))
    .max(12)
    .default([])
    .describe("Facts this source authoritatively establishes"),
  triggerCondition: CnlSentence.optional().describe(
    "When this source is consulted (fallback sources only)",
  ),
});

/** Contingency-specific evidence and source hierarchy. */
export const ContingencyEvidence = z
  .object({
    sources: z
      .array(ContingencyEvidenceSource)
      .min(1)
      .max(20)
      .describe("Ranked evidence sources for contingency resolution"),
    conflictingEvidenceRule: CnlSentence.describe(
      "How contradictory evidence is resolved across ranked contingency sources",
    ),
  })
  .superRefine((e, ctx) => {
    const ranks = e.sources.map((s) => s.rank).sort((a, b) => a - b);
    const valid = ranks.every((rank, i) => rank === i + 1);
    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: `contingency evidence source ranks must be unique and contiguous from 1 (got ${ranks.join(", ")})`,
      });
    }
    const ids = new Set<string>();
    for (const [i, s] of e.sources.entries()) {
      if (ids.has(s.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["sources", i, "id"],
          message: "contingency evidence source ids must be unique",
        });
      }
      ids.add(s.id);
    }
  })
  .describe(
    "Contingency-specific evidence hierarchy (separate from main resolution sources)",
  );

/**
 * One branch in a conditional event-contract family. Each branch is gated
 * on a specific contingency state — the primary resolution criterion applies
 * only if that state obtains.
 */
export const ConditionalEventBranch = z.object({
  branchId: Slug,
  contingencyStateRef: Slug.describe(
    "State id in the contingency's tradable or indeterminate states",
  ),
  contractCodeOrTicker: z
    .string()
    .regex(/^[A-Z0-9][A-Z0-9.\-]{1,29}$/)
    .describe("Ticker for this branch contract"),
  branchLabel: z.string().min(3).max(120),
  placeholderBindings: z
    .record(z.string(), z.string().min(1))
    .optional()
    .describe("Template placeholder bindings for CNL rendering"),
});

/**
 * Conditional-market wrapper, composable with EVERY payout type: the primary
 * resolution criterion applies only if the contingency is met; otherwise the
 * pre-committed `ifUnmet` disposition applies. Supports flexible logic over
 * multiple conditions (all-of / any-of). `canonicalStatement` is rendered
 * deterministically by `renderContingencyStatement()` and verified at parse
 * time, like the resolution statement.
 */
export const Contingency = z
  .object({
    mode: z
      .enum(["all-of", "any-of"])
      .describe("Logic over the listed conditions"),
    conditions: z.array(ContingencyCondition).min(1).max(5),
    ifUnmet: ContingencyUnmetDisposition,
    /** Rendered CNL sentence; validator re-renders and compares. */
    canonicalStatement: CnlSentence,
    /** Structured condition states with typed criteria (required for branch families). */
    conditionStates: z
      .array(ContingencyConditionState)
      .min(2)
      .max(10)
      .optional()
      .describe("Structured states with required/disqualifying criteria"),
    /** Rules for resolving which condition state obtains. */
    stateResolutionRules: ContingencyStateResolutionRules.optional(),
    /** Contingency-specific evidence hierarchy. */
    contingencyEvidence: ContingencyEvidence.optional(),
    /** Branch contracts gated on specific contingency states. */
    branches: z
      .array(ConditionalEventBranch)
      .min(1)
      .max(20)
      .optional()
      .describe("Conditional event branches, one per tradable state"),
  })
  .superRefine((c, ctx) => {
    const condIds = new Set<string>();
    for (const [i, cond] of c.conditions.entries()) {
      if (condIds.has(cond.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["conditions", i, "id"],
          message: "condition ids must be unique",
        });
      }
      condIds.add(cond.id);
    }
    // If conditionStates are present, stateResolutionRules must also be present.
    if (c.conditionStates && !c.stateResolutionRules) {
      ctx.addIssue({
        code: "custom",
        path: ["stateResolutionRules"],
        message:
          "stateResolutionRules is required when conditionStates are provided",
      });
    }
    // If branches are present, conditionStates and stateResolutionRules must also be present.
    if (c.branches && !c.conditionStates) {
      ctx.addIssue({
        code: "custom",
        path: ["conditionStates"],
        message: "conditionStates is required when branches are provided",
      });
    }
    // Validate state id uniqueness in conditionStates.
    if (c.conditionStates) {
      const stateIds = new Set<string>();
      for (const [i, state] of c.conditionStates.entries()) {
        if (stateIds.has(state.stateId)) {
          ctx.addIssue({
            code: "custom",
            path: ["conditionStates", i, "stateId"],
            message: "condition state ids must be unique",
          });
        }
        stateIds.add(state.stateId);
      }
      // Validate stateResolutionRules references.
      if (c.stateResolutionRules) {
        const allStates = new Set(c.conditionStates.map((s) => s.stateId));
        for (const [i, ts] of c.stateResolutionRules.tradableStates.entries()) {
          if (!allStates.has(ts)) {
            ctx.addIssue({
              code: "custom",
              path: ["stateResolutionRules", "tradableStates", i],
              message: `tradable state "${ts}" not found in conditionStates`,
            });
          }
        }
        if (!allStates.has(c.stateResolutionRules.indeterminateState)) {
          ctx.addIssue({
            code: "custom",
            path: ["stateResolutionRules", "indeterminateState"],
            message: "indeterminateState not found in conditionStates",
          });
        }
      }
      // Validate branch contingencyStateRef references.
      if (c.branches && c.stateResolutionRules) {
        const tradable = new Set(c.stateResolutionRules.tradableStates);
        const branchIds = new Set<string>();
        for (const [i, br] of c.branches.entries()) {
          if (branchIds.has(br.branchId)) {
            ctx.addIssue({
              code: "custom",
              path: ["branches", i, "branchId"],
              message: "branch ids must be unique",
            });
          }
          branchIds.add(br.branchId);
          if (!tradable.has(br.contingencyStateRef)) {
            ctx.addIssue({
              code: "custom",
              path: ["branches", i, "contingencyStateRef"],
              message: `branch contingencyStateRef "${br.contingencyStateRef}" must be a tradable state`,
            });
          }
        }
      }
    }
    // Validate contingencyEvidence source refs in criteria.
    if (c.conditionStates && c.contingencyEvidence) {
      const evidenceIds = new Set(
        c.contingencyEvidence.sources.map((s) => s.id),
      );
      for (const [si, state] of c.conditionStates.entries()) {
        for (const criteria of [
          state.requiredCriteria,
          state.disqualifyingCriteria,
        ]) {
          for (const [ci, cr] of criteria.entries()) {
            if (
              cr.evidenceSourceRef &&
              !evidenceIds.has(cr.evidenceSourceRef)
            ) {
              ctx.addIssue({
                code: "custom",
                path: [
                  "conditionStates",
                  si,
                  "requiredCriteria",
                  ci,
                  "evidenceSourceRef",
                ],
                message: `evidenceSourceRef "${cr.evidenceSourceRef}" not found in contingencyEvidence.sources`,
              });
            }
          }
        }
      }
    }
  })
  .describe(
    "Optional conditional-market wrapper: the contract is contingent on stated conditions",
  );

export type ContingencyCriterionT = z.infer<typeof ContingencyCriterion>;
export type ContingencyConditionStateT = z.infer<
  typeof ContingencyConditionState
>;
export type ContingencyStateResolutionRulesT = z.infer<
  typeof ContingencyStateResolutionRules
>;
export type ContingencyEvidenceSourceT = z.infer<
  typeof ContingencyEvidenceSource
>;
export type ContingencyEvidenceT = z.infer<typeof ContingencyEvidence>;
export type ConditionalEventBranchT = z.infer<typeof ConditionalEventBranch>;
export type ContingencyT = z.infer<typeof Contingency>;
