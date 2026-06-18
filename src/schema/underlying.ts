import { z } from "zod";
import { CnlSentence } from "./common";

/* -------------------------------------------------------------------------- */
/* §2 Underlying event                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The proposed § 40.11(b) definition of "gaming": an activity that (i) is
 * typically engaged in for recreation or to entertain others, (ii) is
 * governed by rules, and (iii) includes measurable occurrences or outcomes
 * depending on participants' luck, skill, or athletic ability. Recording the
 * three prongs makes a gaming assessment auditable rather than a bare boolean.
 */
export const GamingDefinitionTest = z.object({
  recreationOrEntertainment: z.boolean(),
  governedByRules: z.boolean(),
  measurableLuckSkillOrAthleticOutcome: z.boolean(),
});

/**
 * Per-activity finding under the proposed event-focused "involves" test.
 * The screen turns on whether the contract's *settlement is determined by* an
 * occurrence in the activity (proposed § 40.11(a)(3)), not on whether the
 * activity is merely topically related.
 */
export const EnumeratedActivityFinding = z
  .object({
    /** Does the contract's settlement turn on an occurrence in this activity? */
    settlementDeterminedByActivity: z.boolean(),
    /** Short justification; required whenever the finding is "involved". */
    note: z.string().default(""),
    /** Only meaningful for the gaming activity; records the (b)(1) prongs. */
    gamingDefinition: GamingDefinitionTest.optional(),
  })
  .superRefine((finding, ctx) => {
    if (
      finding.settlementDeterminedByActivity &&
      finding.note.trim().length < 20
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message:
          "explain the basis when an enumerated activity is assessed as involved (>= 20 chars)",
      });
    }
  })
  .describe(
    "Event-focused 'involves' finding for one enumerated activity (proposed § 40.11(a)(3))",
  );

export const Underlying = z
  .object({
    /** One CNL sentence stating the underlying occurrence/measurement. */
    eventDefinition: CnlSentence.describe(
      "CNL definition of the underlying event or measurement",
    ),
    /**
     * Working CEA classification hypothesis for counsel review.
     * Event contracts are typically structured on an "excluded commodity"
     * (CEA § 1a(19)(iv): an occurrence/extent of an occurrence beyond the
     * parties' control with financial, commercial, or economic consequence).
     */
    commodityClassification: z.object({
      hypothesis: z.enum([
        "excluded-commodity",
        "exempt-commodity",
        "agricultural-commodity",
        "other",
      ]),
      rationale: z
        .string()
        .min(40)
        .describe(
          "Why this classification is believed to apply; flag doubts for counsel",
        ),
    }),
    /**
     * Appendix C asks for a description of the underlying "cash market" —
     * for event contracts, describe the real-world activity, who measures it,
     * how large/liquid the information environment is, and any analogues.
     */
    underlyingMarketDescription: z
      .string()
      .min(100)
      .describe(
        "Appendix-C-style description of the underlying activity and its information environment",
      ),
    /**
     * Enumerated-activity / public-interest screen.
     *
     * Modeled on the CFTC's June 2026 NPRM "Prediction Markets; Public
     * Interest Determinations" (RIN 3038-AF65), which proposes to revise
     * 17 CFR § 40.11. Three load-bearing ideas from that proposal:
     *
     *  1. **Event-focused "involves" test** (proposed § 40.11(a)(3)): a
     *     contract "involves" an enumerated activity only if its *settlement
     *     is determined by* an occurrence, extent of an occurrence, or
     *     contingency *in that activity*. A contract settling on a lawful act
     *     (e.g. a court entering a conviction) does not "involve" the
     *     underlying unlawful conduct, even though that conduct is unlawful.
     *  2. **Enumerated activities** (proposed § 40.11(a)(2)): unlawful
     *     activity, terrorism, assassination, war, gaming, or
     *     Commission-designated similar activity.
     *  3. **"May," not per se**: involving an enumerated activity triggers a
     *     discretionary public-interest analysis (proposed § 40.11(a)(5)-(6)),
     *     not an automatic bar. This schema therefore records a structured
     *     self-assessment for counsel rather than asserting a legal result.
     *
     * This is drafting scaffolding, not a legal conclusion. The proposal is
     * an NPRM (comment stage) and may change; keep `compliance.reviewedAgainst`
     * and `openQuestionsForCounsel` current.
     */
    enumeratedActivityScreen: z.object({
      /**
       * Per-activity assessment using the event-focused "involves" test.
       * `settlementDeterminedByActivity: false` is the safe-harbor answer and
       * should be justified in `settlementOccurrenceAnalysis`.
       */
      activities: z.object({
        unlawfulUnderFederalOrStateLaw: EnumeratedActivityFinding,
        terrorism: EnumeratedActivityFinding,
        assassination: EnumeratedActivityFinding,
        war: EnumeratedActivityFinding,
        gaming: EnumeratedActivityFinding,
        commissionDesignatedSimilarActivity: EnumeratedActivityFinding,
      }),
      /**
       * CNL sentence naming the settlement-determining occurrence and stating
       * the activity it occurs in — the heart of the proposed (a)(3) test.
       * (Cf. the NPRM's securities-fraud example: settlement on the court's
       * judgment, a lawful act, vs. settlement on the underlying conduct.)
       */
      settlementOccurrenceAnalysis: CnlSentence.describe(
        "Identifies the settlement-determining occurrence and the activity it occurs in",
      ),
      /**
       * True if ANY activity above is assessed as involved. Drives whether a
       * public-interest analysis is expected; the root schema enforces that
       * publicInterestAssessment is present when this is true.
       */
      anyEnumeratedActivityInvolved: z.boolean(),
    }),
  })
  .describe(
    "What the contract is about, its working classification, and the proposed § 40.11 enumerated-activity screen",
  );

export type UnderlyingT = z.infer<typeof Underlying>;
