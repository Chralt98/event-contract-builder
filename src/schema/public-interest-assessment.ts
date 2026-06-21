import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §6b Public-interest assessment (proposed § 40.11(a)(5)-(6))                */
/* -------------------------------------------------------------------------- */

/* ── (a)(5)(ii) structured information-leakage assessment ─────────────────── */

export const InformationLeakageAssessment = z
  .object({
    /** How sensitive is the information that determines the outcome? */
    sensitivityOfUnderlyingInformation: z
      .string()
      .min(30)
      .describe(
        "Confidentiality requirements, embargo periods, classification status of the outcome-determining information",
      ),
    /** Does a small number of people control or know the outcome in advance? */
    concentrationOfInsight: z
      .string()
      .min(30)
      .describe(
        "Whether outcome knowledge is concentrated among a small number of individuals",
      ),
    /** Does the contract settle on a discrete human decision by an identifiable individual? */
    discreteDecisionRisk: z
      .string()
      .min(30)
      .describe(
        "Whether settlement depends on discrete decisions by identifiable individuals under pressure",
      ),
    /** What preventive measures exist against leakage and exploitation? */
    safeguardAdequacy: z
      .string()
      .min(30)
      .describe(
        "Safeguards against information leakage, misuse, unlawful acquisition, and third-party exploitation",
      ),
  })
  .describe("Structured (a)(5)(ii) assessment of insider-leakage risk");

/* ── (a)(6) activity-specific factor sub-schemas ─────────────────────────── */

export const GamingFactors = z
  .object({
    /** Does the contract settle on aggregate outcomes or discrete in-game actions? */
    outcomeGranularity: z
      .enum(["aggregate-outcome", "discrete-in-game-action"])
      .describe(
        "aggregate-outcome = final score, season stats, tournament result; discrete-in-game-action = specific play by specific player",
      ),
    outcomeGranularityAnalysis: z
      .string()
      .min(30)
      .describe("Why this granularity classification applies"),
    /** Does the relevant sport/league have integrity infrastructure? */
    leagueIntegrityInfrastructure: z
      .string()
      .min(30)
      .describe(
        "Integrity framework of the relevant league or governing body",
      ),
    /** Is there information-sharing with the governing body? */
    governingBodyInformationSharing: z
      .string()
      .min(30)
      .describe(
        "Nature and extent of coordination with the league or governing body on surveillance and integrity",
      ),
    /** Explicit screen for settlement bases the NPRM flags as contrary to public interest. */
    prohibitedSettlementBases: z
      .object({
        playerInjury: z
          .boolean()
          .describe("Does settlement depend on player injuries?"),
        officiatingDecisions: z
          .boolean()
          .describe("Does settlement depend on officiating outcomes?"),
        physicalAltercations: z
          .boolean()
          .describe(
            "Does settlement depend on physical altercations between participants?",
          ),
        preCollegiateSports: z
          .boolean()
          .describe("Does the contract involve pre-collegiate sports?"),
      })
      .describe(
        "NPRM-flagged settlement bases that are presumptively contrary to public interest",
      ),
  })
  .superRefine((g, ctx) => {
    const anyProhibited =
      g.prohibitedSettlementBases.playerInjury ||
      g.prohibitedSettlementBases.officiatingDecisions ||
      g.prohibitedSettlementBases.physicalAltercations ||
      g.prohibitedSettlementBases.preCollegiateSports;
    if (anyProhibited && g.outcomeGranularity === "aggregate-outcome") {
      ctx.addIssue({
        code: "custom",
        path: ["prohibitedSettlementBases"],
        message:
          "a prohibited settlement basis is flagged but outcomeGranularity is aggregate-outcome — verify consistency",
      });
    }
  })
  .describe("Gaming/sports-specific factors (proposed § 40.11(a)(6))");

export const UnlawfulActivityFactors = z
  .object({
    /** Federal, state, or both? */
    jurisdictionalScope: z
      .enum(["federal", "state", "both"])
      .describe("At what level the activity is unlawful"),
    /** Does the contract reference aggregate rates or specific conduct? */
    conductSpecificity: z
      .enum(["aggregate-rates", "specific-conduct"])
      .describe(
        "aggregate-rates = crime rates over time; specific-conduct = specific unlawful act",
      ),
    conductSpecificityAnalysis: z
      .string()
      .min(30)
      .describe("Why this specificity classification applies"),
    /** Could the contract incentivize specific unlawful acts? */
    incentivizesSpecificUnlawfulActs: z.boolean(),
    incentiveAnalysis: z
      .string()
      .min(30)
      .describe(
        "Analysis of whether the contract creates financial incentive for specific unlawful conduct",
      ),
  })
  .describe(
    "Unlawful-activity-specific factors (proposed § 40.11(a)(6))",
  );

export const TerrorismWarFactors = z
  .object({
    nationalSecurityRiskAnalysis: z
      .string()
      .min(30)
      .describe("Assessment of national security implications"),
    violenceIncentiveAnalysis: z
      .string()
      .min(30)
      .describe(
        "Whether the contract creates financial incentive for violence or harm",
      ),
    settlementIntegrityAnalysis: z
      .string()
      .min(30)
      .describe(
        "Settlement reliability concerns — fog of war, contested facts, limited verifiable information",
      ),
    enforcementInterferenceRisk: z
      .string()
      .min(30)
      .describe(
        "Risk of distracting law enforcement or military, or incentivizing trading over reporting",
      ),
  })
  .describe(
    "Terrorism/assassination/war-specific factors (proposed § 40.11(a)(6))",
  );

/* ── Top-level public-interest assessment ────────────────────────────────── */

/**
 * Self-assessment against the public-interest factors proposed in the June
 * 2026 NPRM for § 40.11(a)(5) (applicable to all enumerated-activity
 * contracts) and § 40.11(a)(6) (activity-specific). Required only when the
 * enumerated-activity screen flags involvement. This records the registered
 * entity's *own* analysis for counsel; the Commission applies these factors
 * itself and may reach a different conclusion.
 */
export const PublicInterestAssessment = z
  .object({
    /** (a)(5)(i) — hedging/price-basing utility, useful information, innovation. Cross-references economicsAndUtility for detail. */
    economicPurposeAndInformationValue: z.string().min(120),
    /** (a)(5)(ii) — structured insider-leakage and settlement-integrity risk assessment. */
    informationLeakageAssessment: InformationLeakageAssessment,
    /** (a)(5)(iii) — strain on the entity's self-regulatory / compliance tools. */
    selfRegulatoryBurden: z.string().min(80),
    /** (a)(6) gaming/sports — required when gaming is assessed as involved. */
    gamingFactors: GamingFactors.optional(),
    /** (a)(6) unlawful activity — required when unlawful activity is assessed as involved. */
    unlawfulActivityFactors: UnlawfulActivityFactors.optional(),
    /** (a)(6) terrorism/assassination/war — required when any of these are assessed as involved. */
    terrorismWarFactors: TerrorismWarFactors.optional(),
    /** Honest self-view of where this nets out, for internal triage only. */
    draftSelfAssessment: z.enum([
      "likely-supports-public-interest",
      "uncertain-needs-counsel",
      "likely-contrary-to-public-interest",
    ]),
  })
  .describe(
    "Self-assessment against proposed § 40.11(a)(5)-(6) public-interest factors",
  );

export type InformationLeakageAssessmentT = z.infer<typeof InformationLeakageAssessment>;
export type GamingFactorsT = z.infer<typeof GamingFactors>;
export type UnlawfulActivityFactorsT = z.infer<typeof UnlawfulActivityFactors>;
export type TerrorismWarFactorsT = z.infer<typeof TerrorismWarFactors>;
export type PublicInterestAssessmentT = z.infer<typeof PublicInterestAssessment>;
