import { z } from "zod";

/**
 * Trader-facing product name: a free-form question string.
 *
 * Names are authored by agents/LLMs via prompt guidance (MCP), so the schema no
 * longer imposes CNL templates, a fixed `Will|Which|What` opener, or a
 * hedging-term denylist. Only two structural constraints remain: a bounded
 * length and a trailing `?`. Wording quality is steered by the generating
 * prompt, not by the type.
 */
export const ProductName = z
  .string()
  .min(10)
  .max(200)
  // Keep this as a runtime refinement rather than a regex so connector
  // validators cannot double-escape the generated JSON Schema pattern.
  .refine((value) => value.endsWith("?"), "Product name must end with ?")
  .describe("Trader-facing product name question");

export type ProductNameT = z.infer<typeof ProductName>;
