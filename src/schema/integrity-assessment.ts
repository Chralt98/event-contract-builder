import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §6 Manipulation & integrity assessment (Core Principle 3)                  */
/* -------------------------------------------------------------------------- */

/**
 * Five-factor structured breakdown of market-integrity edge cases. Each factor
 * addresses a distinct manipulation or information-asymmetry vector that the
 * canonical spec requires be analyzed individually rather than lumped into
 * a single narrative.
 */
export const MarketIntegrityEdgeCases = z
  .object({
    /** Can the contract's existence or trading activity itself influence the outcome? */
    selfFulfillingEventRisk: z
      .string()
      .min(50)
      .describe(
        "Whether the contract could create incentives that influence the underlying outcome",
      ),
    /** Can any market participant directly influence the outcome? */
    participantInfluenceOverEvent: z
      .string()
      .min(50)
      .describe(
        "Whether any participant class has the ability to influence the underlying event",
      ),
    /** Can anyone capture or corrupt the resolution data source? */
    sourceCaptureRisk: z
      .string()
      .min(50)
      .describe(
        "Whether a participant could corrupt, influence, or capture the settlement data source",
      ),
    /** Can coordinated information campaigns distort prices or settlement? */
    coordinatedInformationCampaignRisk: z
      .string()
      .min(50)
      .describe(
        "Whether coordinated misinformation or rumor campaigns could distort trading or settlement",
      ),
    /** Can anyone exploit privileged information about the outcome? */
    privilegedInformationRisk: z
      .string()
      .min(50)
      .describe(
        "Whether anyone has privileged access to outcome-determining information before public release",
      ),
  })
  .describe(
    "Five-factor market-integrity edge-case analysis (self-fulfilling, participant influence, source capture, info campaigns, privileged info)",
  );

export const IntegrityAssessment = z
  .object({
    /** Who could influence the underlying outcome itself, and at what cost. */
    outcomeInfluenceAnalysis: z.string().min(120),
    /** Who could know the outcome before the public (insider asymmetry). */
    informationAsymmetryAnalysis: z.string().min(120),
    /** Why the settlement source is hard to distort (ties to Appendix C cash-settlement criteria: reliability, public availability, timeliness). */
    sourceRobustnessAnalysis: z.string().min(120),
    /** Surveillance hooks: what patterns the DCM should monitor for this product. */
    surveillanceConsiderations: z.array(z.string().min(20)).min(2),
    overallSusceptibility: z.enum(["low", "medium", "high"]),
    /** Required honesty valve: if medium/high, mitigations must be listed. */
    mitigations: z.array(z.string().min(20)).default([]),
    /** Structured five-factor market-integrity edge-case breakdown. */
    marketIntegrityEdgeCases: MarketIntegrityEdgeCases,
  })
  .superRefine((a, ctx) => {
    if (a.overallSusceptibility !== "low" && a.mitigations.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["mitigations"],
        message: "mitigations required when susceptibility is medium or high",
      });
    }
  })
  .describe("Narrative analysis supporting DCM Core Principle 3");

export type MarketIntegrityEdgeCasesT = z.infer<
  typeof MarketIntegrityEdgeCases
>;
export type IntegrityAssessmentT = z.infer<typeof IntegrityAssessment>;
