import { z } from "zod";
import { Resolution } from "./resolution";

/**
 * Root schema for one event-contract specification document (one YAML file).
 */
export const EventContractSpec = z
  .object({
    /** DSL version this document targets. */
    dsl: z.literal("event-contract-cnl/0.1"),
    resolution: Resolution,
  })
  .describe(
    "Draft event-contract specification (CNL DSL v0.1) for pre-DCM review",
  );

export type EventContractSpecT = z.infer<typeof EventContractSpec>;
