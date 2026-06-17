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
  })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    for (const [i, cond] of c.conditions.entries()) {
      if (ids.has(cond.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["conditions", i, "id"],
          message: "condition ids must be unique",
        });
      }
      ids.add(cond.id);
    }
  })
  .describe(
    "Optional conditional-market wrapper: the contract is contingent on stated conditions",
  );
