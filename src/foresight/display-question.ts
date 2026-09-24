import { z } from "zod";

/** One user-facing forecast question, optionally parameterized by variables. */
export const DisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  // Keep this as a runtime refinement rather than a regex so connector
  // validators cannot double-escape the generated JSON Schema pattern.
  .refine((value) => value.endsWith("?"), "Must end with ?")
  .describe("User-facing forecast question, ending in '?'");

export type DisplayQuestionT = z.infer<typeof DisplayQuestion>;

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

/** Every selectable unit uses this one parameterized shape. */
export const DraftUnit = z
  .object({
    question: DisplayQuestion.describe(
      "The forecast question; use angle-bracket placeholders only for declared variables.",
    ),
    variables: z.array(TemplateVariable).optional(),
  })
  .superRefine((unit, ctx) => {
    const placeholders = [
      ...new Set(
        [...unit.question.matchAll(/<([^<>]+)>/g)].map((match) => match[1]!),
      ),
    ];
    const variableNames = (unit.variables ?? []).map(({ name }) => name);
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
  .describe(
    "Glossary of key terms used in the forecast specification: word → definition",
  );

export type DefinitionsT = z.infer<typeof Definitions>;
