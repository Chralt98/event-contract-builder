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
  .regex(/\?$/s, "Product name must end with ?")
  .describe("Trader-facing product name question");

export type ProductNameT = z.infer<typeof ProductName>;
