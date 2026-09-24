import { z } from "zod";

/**
 * Trader-facing forecast question with optional parameter or outcome values.
 */
export const DisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  // Keep this as a runtime refinement rather than a regex so connector
  // validators cannot double-escape the generated JSON Schema pattern.
  .refine((value) => value.endsWith("?"), "Must end with ?")
  .describe("Trader-facing forecast question, ending in '?'");

export type DisplayQuestionT = z.infer<typeof DisplayQuestion>;

/** One named finite parameter or categorical outcome set. */
export const TemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .refine(
      (value) => value === value.trim() && !/[<>]/.test(value),
      "Must be a trimmed variable name without angle brackets",
    )
    .describe(
      "Name of a narrow, finite parameter or outcome dimension such as a date, match, city, candidate, or party.",
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
      "Explicit closed list of values. Values may fill a same-named question placeholder or define the categorical outcomes of a question without appearing in its wording. Every value and meaningful combination must use the same settlement source, formula, procedure, methodology, event interpretation, and legal/compliance analysis.",
    ),
});

export type TemplateVariableT = z.infer<typeof TemplateVariable>;

/** Every selectable forecast uses one question-and-values shape. */
export const DraftUnit = z
  .object({
    question: DisplayQuestion.describe(
      "The forecast question. Any angle-bracket placeholder must have a same-named declared variable; categorical outcome variables need not appear as placeholders.",
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
        message: "Variable names must be unique",
      });
    }
    const missing = placeholders.filter(
      (name) => !variableNames.includes(name),
    );
    const unreferenced = variableNames.filter(
      (name) => !placeholders.includes(name),
    );
    if (missing.length) {
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message: `Every question placeholder must have a same-named variable (missing variables: ${missing.join(", ")})`,
      });
    }
    if (unreferenced.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message:
          "A categorical question may have only one outcome variable that is not represented by a placeholder",
      });
    }
    for (const name of unreferenced) {
      const variable = unit.variables?.find(
        (candidate) => candidate.name === name,
      );
      if (variable && variable.values.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["variables"],
          message: `Categorical outcome variable '${name}' must contain at least two values`,
        });
      }
    }
  });

export type DraftUnitT = z.infer<typeof DraftUnit>;

/** Return the optional categorical outcome variable, if the unit declares one. */
export function categoricalOutcomeVariable(
  unit: DraftUnitT,
): TemplateVariableT | undefined {
  const placeholders = new Set(
    [...unit.question.matchAll(/<([^<>]+)>/g)].map((match) => match[1]!),
  );
  return (unit.variables ?? []).find(({ name }) => !placeholders.has(name));
}

/**
 * Glossary mapping each key term to its precise, unambiguous definition.
 * Keys and values are both required to be non-empty.
 */
export const Definitions = z
  .record(z.string().min(1), z.string().min(1))
  .describe(
    "Glossary of key terms used in the specification: word → definition",
  );

export type DefinitionsT = z.infer<typeof Definitions>;
