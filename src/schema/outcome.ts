import { z } from "zod";

/**
 * Phase 1 supports binary outcomes only. This will become a
 * `z.discriminatedUnion("type", [...])` once categorical and scalar
 * outcomes are added (see PLAN.md roadmap).
 */
export const OutcomeSchema = z.object({
  type: z.literal("binary").describe("Outcome type discriminator."),
  values: z.tuple([z.literal("Yes"), z.literal("No")]).describe("Binary outcome values."),
});
