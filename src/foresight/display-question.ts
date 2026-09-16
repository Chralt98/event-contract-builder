import { z } from "zod";

/**
 * A single user-facing display question: the actual question a user would
 * see on a forecast specification platform, with every placeholder already filled
 * in (a concrete team, date, threshold, etc.).
 *
 * A display question is the resolved, user-facing string shown to users.
 * It is distinct from any forecast specification-level product name or description.
 */
export const DisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  // Keep this as a runtime refinement rather than a regex so connector
  // validators cannot double-escape the generated JSON Schema pattern.
  .refine((value) => value.endsWith("?"), "Must end with ?")
  .describe("User-facing display question, ending in '?'");

export type DisplayQuestionT = z.infer<typeof DisplayQuestion>;

/**
 * A display-question template. Unlike `DisplayQuestion`, this deliberately
 * retains one or more angle-bracket placeholders for a configurable forecast specification
 * family, for example `<date>` or `<match>`.
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
    "User-facing display-question template with angle-bracket placeholders, ending in '?'.",
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
 * A selectable draft unit. A scalar, categorical, or template forecast specification is
 * selected as a whole. Scalar/categorical units carry several concrete
 * questions; a template carries one placeholder-bearing question and the
 * allowed values for each placeholder; a binary forecast specification is one standalone
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
    z.object({
      type: z.literal("template"),
      question: DisplayQuestionTemplate,
      variables: z
        .array(TemplateVariable)
        .min(1)
        .superRefine((variables, ctx) => {
          const names = variables.map(({ name }) => name);
          if (new Set(names).size !== names.length) {
            ctx.addIssue({
              code: "custom",
              message: "Template variable names must be unique",
            });
          }
        })
        .describe(
          "One entry per distinct placeholder. Use only narrow finite parameters whose every allowed value and meaningful combination shares the same qualifying predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis.",
        ),
    }),
  ])
  .superRefine((unit, ctx) => {
    if (unit.type !== "template") return;

    const placeholders = [
      ...new Set(
        [...unit.question.matchAll(/<([^<>]+)>/g)].map((match) => match[1]!),
      ),
    ];
    const variableNames = unit.variables.map(({ name }) => name);
    const missing = placeholders.filter(
      (name) => !variableNames.includes(name),
    );
    const undeclared = variableNames.filter(
      (name) => !placeholders.includes(name),
    );

    if (missing.length > 0 || undeclared.length > 0) {
      const details = [
        ...(missing.length > 0
          ? [`missing variables: ${missing.join(", ")}`]
          : []),
        ...(undeclared.length > 0
          ? [`undeclared variables: ${undeclared.join(", ")}`]
          : []),
      ].join("; ");
      ctx.addIssue({
        code: "custom",
        path: ["variables"],
        message: `Template variables must match the question placeholders exactly (${details})`,
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
