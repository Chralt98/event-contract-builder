import { z } from "zod";

/**
 * Phase 1 supports binary outcomes only. This will become a
 * `z.discriminatedUnion("type", [...])` once categorical and scalar
 * outcomes are added (see PLAN.md roadmap).
 */
export const Outcome = z.object({
  type: z.literal("binary").describe("Outcome type discriminator."),
  values: z
    .tuple([z.literal("Yes"), z.literal("No")])
    .describe("Binary outcome values."),
  yesDefinition: z
    .string()
    .min(10)
    .describe("Plain-language definition of what constitutes a Yes outcome"),
  noDefinition: z
    .string()
    .min(10)
    .describe("Plain-language definition of what constitutes a No outcome"),
});

export type OutcomeT = z.infer<typeof Outcome>;
