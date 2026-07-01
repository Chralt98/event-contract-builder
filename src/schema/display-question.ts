import { z } from "zod";

/**
 * A single trader-facing display question: the actual question a trader would
 * see on a prediction-market platform, with every placeholder already filled
 * in (a concrete team, date, threshold, etc.).
 *
 * This is deliberately distinct from `ProductName`: a product name is the
 * event-contract-level phrasing and may carry placeholders like `<team>` or
 * `<date>`, whereas a display question is the resolved, retail-facing string.
 * The two only share structural constraints — bounded length and a trailing
 * `?` — not identity.
 */
export const DisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  .regex(/\?$/s, "Must end with ?")
  .describe("Trader-facing display question, ending in '?'");

export type DisplayQuestionT = z.infer<typeof DisplayQuestion>;

/**
 * A selectable draft unit. A scalar or categorical market is selected as a
 * whole, so it carries several display questions; a binary market is one
 * standalone display question.
 */
export const DraftUnit = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("binary"),
    question: DisplayQuestion.describe(
      "The single Yes/No display question, ending in '?'.",
    ),
  }),
  z.object({
    type: z.literal("scalar"),
    questions: z
      .array(DisplayQuestion)
      .min(2)
      .describe(
        "One binary question per numeric range (at least two). Ranges must not " +
          "overlap and should cover the plausible space so exactly one " +
          "resolves Yes.",
      ),
  }),
  z.object({
    type: z.literal("categorical"),
    questions: z
      .array(DisplayQuestion)
      .min(2)
      .describe(
        "One binary question per mutually exclusive option (at least two); " +
          "each asks whether that option occurs.",
      ),
  }),
]);

export type DraftUnitT = z.infer<typeof DraftUnit>;

/**
 * Glossary mapping each key term to its precise, unambiguous definition.
 * Keys and values are both required to be non-empty.
 */
export const Definitions = z
  .record(z.string().min(1), z.string().min(1))
  .describe("Glossary of key terms used in the contract: word → definition");

export type DefinitionsT = z.infer<typeof Definitions>;
