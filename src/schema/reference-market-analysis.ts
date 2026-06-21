import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §10 Reference market analysis                                              */
/*     (Appendix C (a) — cash market description; (c)(2) — manipulation risk; */
/*      (c)(3) — settlement source characteristics)                           */
/* -------------------------------------------------------------------------- */

export const ReferenceMarketAnalysis = z
  .object({
    /** Description of the reference market, data series, or information environment the contract settles against. */
    referenceMarketDescription: z
      .string()
      .min(80)
      .describe(
        "What the underlying 'cash market' is — for event contracts, the data series, measurement, or information environment",
      ),
    /** How the source produces the settlement-relevant data: methodology, calculation, sampling, etc. */
    sourceMethodology: z
      .string()
      .min(50)
      .describe(
        "Methodology the source uses to produce the settlement-relevant value",
      ),
    /** Current availability of the data needed for settlement. */
    dataAvailability: z
      .string()
      .min(30)
      .describe(
        "Whether the settlement data is currently available and any timing or access constraints",
      ),
    /** Whether historical data exists for the reference series. */
    historicalDataAvailable: z.boolean().describe(
      "Whether at least three years of historical data exist for the reference series (Appendix C (a) benchmark)",
    ),
    /** Description of available historical data — series, time span, where to find it. */
    historicalDataDescription: z
      .string()
      .min(30)
      .describe(
        "What historical data exists, how far back, and where it can be accessed",
      ),
    /** Size, liquidity, and depth of the underlying information or cash market. */
    liquidityOrMarketSizeAnalysis: z
      .string()
      .min(50)
      .describe(
        "Size and liquidity of the underlying market or expected liquidity drivers for the contract",
      ),
    /** Whether settlement depends on a small number of sources, and how that risk is mitigated. */
    concentrationRiskAnalysis: z
      .string()
      .min(50)
      .describe(
        "Source concentration risk and mitigations (fallback paths, alternative sources)",
      ),
    /** How the benchmark or reference data is governed — institutional controls, methodology stability. */
    benchmarkOrReferenceGovernance: z
      .string()
      .min(30)
      .describe(
        "Governance framework for the reference data: who controls methodology, what change processes exist",
      ),
  })
  .superRefine((r, ctx) => {
    if (r.historicalDataAvailable && r.historicalDataDescription.length < 50) {
      ctx.addIssue({
        code: "custom",
        path: ["historicalDataDescription"],
        message:
          "provide a substantive description when historical data is available (>= 50 chars)",
      });
    }
  })
  .describe(
    "Appendix C (a) cash-market description: reference data environment, methodology, history, concentration risk, and governance",
  );

export type ReferenceMarketAnalysisT = z.infer<typeof ReferenceMarketAnalysis>;
