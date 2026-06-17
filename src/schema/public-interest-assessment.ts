import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §6b Public-interest assessment (proposed § 40.11(a)(5)-(6))                 */
/* -------------------------------------------------------------------------- */

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
    /** (a)(5)(i) — hedging/price-basing utility, useful information, innovation. */
    economicPurposeAndInformationValue: z.string().min(120),
    /** (a)(5)(ii) — manipulation, settlement-integrity, insider-leakage risks. */
    integrityAndLeakageRisk: z.string().min(120),
    /** (a)(5)(iii) — strain on the entity's self-regulatory / compliance tools. */
    selfRegulatoryBurden: z.string().min(80),
    /**
     * (a)(6) — factors specific to whichever activity is involved. Provide the
     * activity-specific analysis the proposal calls for (e.g. for gaming:
     * aggregate-outcome vs. discrete-action, integrity framework, surveillance
     * and league information-sharing; for unlawful activity: federal vs. state,
     * aggregate-crime-rate carve-out; for terrorism/assassination/war: national
     * security, insider duty, facilitation incentive, information value).
     */
    activitySpecificFactors: z.array(z.string().min(20)).min(1),
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
