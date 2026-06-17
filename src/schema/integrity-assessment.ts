import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §6 Manipulation & integrity assessment (Core Principle 3)                  */
/* -------------------------------------------------------------------------- */

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
