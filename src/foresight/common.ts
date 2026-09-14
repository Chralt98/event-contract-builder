import { z } from "zod";

/** Stable machine identifier: lowercase kebab-case. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be lowercase kebab-case")
  .describe("Stable lowercase kebab-case identifier");
