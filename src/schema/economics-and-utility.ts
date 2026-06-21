import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §9 Economics & utility                                                     */
/*    (Appendix C (a) — market research / risk management needs;              */
/*     proposed § 40.11(a)(5)(i) — hedging, price basing, information value)  */
/* -------------------------------------------------------------------------- */

export const EconomicsAndUtility = z
  .object({
    /** Why this contract exists and what economic, financial, or commercial decisions it informs. */
    economicPurpose: z
      .string()
      .min(50)
      .describe(
        "Statement of the contract's economic purpose and the decisions it is designed to inform",
      ),
    /** Who the contract is designed for — hedgers, researchers, institutions, retail participants. */
    intendedMarketParticipants: z
      .array(z.string().min(15))
      .min(1)
      .describe(
        "Classes of market participants the contract is designed to serve",
      ),
    /** Specific hedging or risk-transfer use cases the contract enables. */
    hedgingOrRiskManagementUtility: z
      .string()
      .min(30)
      .describe(
        "How the contract supports hedging, risk transfer, or planning for entities with exposure to the underlying",
      ),
    /** What information aggregate contract prices reveal about the underlying. */
    priceDiscoveryUtility: z
      .string()
      .min(30)
      .describe(
        "What economically useful information the contract's market prices produce",
      ),
    /** Whether analogous futures, swaps, or derivatives markets exist and how this contract relates. */
    relationshipToExistingReferenceMarkets: z
      .string()
      .min(30)
      .describe(
        "Existing reference markets or lack thereof, and how this contract complements or differs from them",
      ),
  })
  .describe(
    "Economic justification: purpose, participants, hedging utility, price discovery, and market context (Appendix C (a) / proposed § 40.11(a)(5)(i))",
  );

export type EconomicsAndUtilityT = z.infer<typeof EconomicsAndUtility>;
