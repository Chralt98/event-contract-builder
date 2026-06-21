import { z } from "zod";
import { CnlSentence } from "./common";

/* -------------------------------------------------------------------------- */
/* §9 Change control (post-launch governance)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Spec sections that can be frozen once the contract begins trading. Using a
 * fixed enum (rather than free-form paths) keeps the immutability list
 * machine-checkable and prevents typos that would silently weaken the freeze.
 */
export const ImmutableSection = z
  .enum([
    "meta.productName",
    "underlying",
    "outcome",
    "resolution.criterion",
    "resolution.observationWindow",
    "resolution.sources",
    "resolution.materiality",
    "resolution.exclusions",
    "resolution.resolutionDeadline",
    "payout",
  ])
  .describe("A spec section eligible to be frozen after launch");

/**
 * Post-launch governance: which terms are immutable once trading opens, and
 * the rules separating non-material clarifications (allowed) from material
 * amendments (require a new version/ticker). Mirrors the change-control block
 * in source contingency specs — the single most important lifecycle guard
 * against silently rewriting traded terms.
 */
export const ChangeControl = z
  .object({
    /** Sections frozen once trading opens; altering them requires a new version/ticker. */
    immutableAfterLaunch: z
      .array(ImmutableSection)
      .min(1)
      .describe("Sections that may not change after the first trading time"),
    /** Whether non-material clarifications are permitted after launch. */
    clarificationAllowedAfterLaunch: z
      .boolean()
      .describe("Whether non-material clarifications are allowed post-launch"),
    /** CNL sentence: what qualifies as an allowed non-material clarification. */
    clarificationRule: CnlSentence.describe(
      "What counts as a non-material clarification that does not alter traded terms",
    ),
    /** CNL sentence: how material changes are handled (new version/ticker, no effect on listed terms). */
    amendmentRule: CnlSentence.describe(
      "How material changes are handled — typically a new contract version or ticker",
    ),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    for (const [i, section] of c.immutableAfterLaunch.entries()) {
      if (seen.has(section)) {
        ctx.addIssue({
          code: "custom",
          path: ["immutableAfterLaunch", i],
          message: `duplicate immutable section "${section}"`,
        });
      }
      seen.add(section);
    }
  })
  .describe(
    "Post-launch governance: immutable terms plus clarification-vs-amendment rules",
  );

export type ImmutableSectionT = z.infer<typeof ImmutableSection>;
export type ChangeControlT = z.infer<typeof ChangeControl>;
