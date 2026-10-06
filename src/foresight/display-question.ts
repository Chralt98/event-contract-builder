import { z } from "zod";

/**
 * Trader-facing Yes/No forecast question with optional substitution values.
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

export const MAX_TEMPLATE_VARIABLES = 5;
export const MAX_VARIABLE_VALUES = 50;

/** One named finite set of values substituted into a question placeholder. */
export const TemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .refine(
      (value) => value === value.trim() && !/[<>]/.test(value),
      "Must be a trimmed variable name without angle brackets",
    )
    .describe(
      "Name of a finite question parameter such as a date, match, city, candidate, or numeric range; use it as an angle-bracket placeholder.",
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
    .max(MAX_VARIABLE_VALUES)
    .superRefine((values, ctx) => {
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: "custom",
          message: "Template variable values must be unique",
        });
      }
    })
    .describe(
      "Explicit closed list of values substituted for this variable's same-named question or condition placeholder. Each substitution yields an individual Yes/No question. Every value and meaningful combination must use the same condition and unmet disposition, source, formula, procedure, methodology, event interpretation, and legal/compliance analysis.",
    ),
});

export type TemplateVariableT = z.infer<typeof TemplateVariable>;

/** Declarative prerequisite resolved before the forecast outcome is evaluated. */
export const ConditionStatement = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .describe(
    "Prerequisite text, preferably declarative and stating its own explicit cutoff, such as 'A law is enacted on or before June 30, 2027, 23:59 UTC'; a question mark is not required.",
  );

export const ForecastCondition = z
  .object({
    statement: ConditionStatement.describe(
      "The observable prerequisite and its explicit condition cutoff, distinct from and no later than the forecast resolution deadline; it may be written as a clause or a question.",
    ),
    ifUnmet: z
      .enum([
        "annulled",
        "resolve-no",
        "resolve-yes",
        "resolve-50-50",
        "custom",
      ])
      .describe("Disposition when the prerequisite is established as unmet."),
    customIfUnmet: z
      .string()
      .trim()
      .max(500)
      .describe(
        "Specific user-defined disposition when the prerequisite is unmet; include any required outcome, cutoff, and reference value or source.",
      )
      .optional(),
  })
  .superRefine((condition, ctx) => {
    if (
      condition.ifUnmet === "custom" &&
      (condition.customIfUnmet?.length ?? 0) < 3
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["customIfUnmet"],
        message: "Describe what happens when the condition is not met",
      });
    }
    if (
      condition.ifUnmet !== "custom" &&
      condition.customIfUnmet !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["customIfUnmet"],
        message: "A custom disposition is only allowed when ifUnmet is custom",
      });
    }
  });

/** Every selectable forecast uses one question with optional values and condition. */
export const DraftUnit = z
  .object({
    question: DisplayQuestion.describe(
      "A forecast question answerable Yes or No for each placeholder substitution, ending in '?'. Every angle-bracket placeholder in the question or condition must have a same-named variable, and every variable must be used as a placeholder.",
    ),
    variables: z.array(TemplateVariable).max(MAX_TEMPLATE_VARIABLES).optional(),
    condition: ForecastCondition.optional(),
  })
  .superRefine((unit, ctx) => {
    const placeholders = [
      ...new Set(
        [unit.question, unit.condition?.statement ?? ""].flatMap((text) =>
          [...text.matchAll(/<([^<>]+)>/g)].map((match) => match[1]!),
        ),
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
    if (unreferenced.length) {
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message: `Every variable must be used as a same-named placeholder in the question or condition (unused variables: ${unreferenced.join(", ")})`,
      });
    }
  });

export type DraftUnitT = z.infer<typeof DraftUnit>;
export type ConditionStatementT = z.infer<typeof ConditionStatement>;
export type ForecastConditionT = z.infer<typeof ForecastCondition>;

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
