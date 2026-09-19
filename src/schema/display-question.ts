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
  // Keep this as a runtime refinement rather than a regex so connector
  // validators cannot double-escape the generated JSON Schema pattern.
  .refine((value) => value.endsWith("?"), "Must end with ?")
  .describe("Trader-facing display question, ending in '?'");

export type DisplayQuestionT = z.infer<typeof DisplayQuestion>;

/**
 * A display-question template. Unlike `DisplayQuestion`, this deliberately
 * retains one or more angle-bracket placeholders for a configurable market
 * family, for example `<date>` or `<candidate>`.
 */
export const DisplayQuestionTemplate = z
  .string()
  .min(10)
  .max(200)
  .refine((value) => value.endsWith("?"), "Must end with ?")
  .refine(
    (value) => [...value.matchAll(/<([^<>]+)>/g)].length > 0,
    "Must contain at least one angle-bracket placeholder",
  )
  .describe(
    "Trader-facing Yes/No display-question template with angle-bracket placeholders, ending in '?'. Phrase each placeholder as a grammatical slot so replacing it with every allowed value produces correct English; do not use the placeholder name as a stand-in for the values.",
  );

export type DisplayQuestionTemplateT = z.infer<typeof DisplayQuestionTemplate>;

/** One named placeholder and the concrete values offered for it. */
export const TemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .refine(
      (value) => value === value.trim() && !/[<>]/.test(value),
      "Must be a trimmed placeholder name without angle brackets",
    )
    .describe(
      "Name of a narrow, finite parameter such as a date, match, city, or candidate, not an open-ended event or outcome category.",
    ),
  values: z
    .array(
      z
        .string()
        .min(1)
        .refine(
          (value) => value === value.trim(),
          "Must be a non-empty, trimmed value",
        ),
    )
    .min(1)
    .superRefine((values, ctx) => {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          message: "Template variable values must be unique",
        });
      }
    })
    .describe(
      "Explicit closed list of concrete values. Every value and meaningful combination must use the same settlement source, formula, procedure, and methodology, with the same event interpretation and legal/compliance analysis.",
    ),
});

export type TemplateVariableT = z.infer<typeof TemplateVariable>;

/**
 * A selectable draft unit. A scalar, categorical, or template market is
 * selected as a whole. Scalar/categorical units carry several concrete
 * questions; a template carries one placeholder-bearing question and the
 * allowed values for each placeholder; a binary market is one standalone
 * display question.
 */
export const DraftUnit = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("binary"),
      question: DisplayQuestion.describe(
        "The single Yes/No display question, ending in '?'.",
      ),
    }),
    z.object({
      type: z.literal("template"),
      question: DisplayQuestionTemplate,
      variables: z.array(TemplateVariable).min(1),
    }),
  ])
  .superRefine((unit, ctx) => {
    if (unit.type === "binary") return;
    const placeholders = [
      ...new Set(
        [...unit.question.matchAll(/<([^<>]+)>/g)].map((match) => match[1]!),
      ),
    ];
    const variableNames = unit.variables.map(({ name }) => name);
    if (new Set(variableNames).size !== variableNames.length) {
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message: "Template variable names must be unique",
      });
    }
    const missing = placeholders.filter(
      (name) => !variableNames.includes(name),
    );
    const undeclared = variableNames.filter(
      (name) => !placeholders.includes(name),
    );
    if (missing.length || undeclared.length) {
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message: `Template variables must match the question placeholders exactly (${[
          ...(missing.length
            ? [`missing variables: ${missing.join(", ")}`]
            : []),
          ...(undeclared.length
            ? [`undeclared variables: ${undeclared.join(", ")}`]
            : []),
        ].join("; ")})`,
      });
    }
  });

export type DraftUnitT = z.infer<typeof DraftUnit>;

/**
 * Glossary mapping each key term to its precise, unambiguous definition.
 * Keys and values are both required to be non-empty.
 */
export const Definitions = z
  .record(z.string().min(1), z.string().min(1))
  .describe("Glossary of key terms used in the contract: word → definition");

export type DefinitionsT = z.infer<typeof Definitions>;
