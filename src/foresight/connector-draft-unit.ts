import { z } from "zod";
import {
  ConditionStatement,
  DraftUnit,
  MAX_TEMPLATE_VARIABLES,
  MAX_VARIABLE_VALUES,
  type DraftUnitT,
} from "./display-question";

/**
 * Connector-safe representation of a draft unit.
 *
 * Keep the wire schema flat and restore the domain invariants in the tool
 * handler. Each variable supplies finite substitutions for a named question
 * or condition placeholder; every expanded question remains Yes/No.
 */
const ConnectorDisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  .describe(
    "A user-facing forecast question answerable Yes or No for each placeholder substitution, ending in '?'.",
  );

const ConnectorTemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of one finite question parameter such as a date, match, city, candidate, or numeric range; use it as an angle-bracket placeholder.",
    ),
  values: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_VARIABLE_VALUES)
    .describe(
      "Explicit closed set of substitutions for the same-named question or condition placeholder. Each substitution yields an individual Yes/No question. Every value and meaningful combination must share the same condition and unmet disposition, qualifying predicate, interpretation, sources, formula, procedure, methodology, and legal/compliance analysis.",
    ),
});

export const ConnectorDraftUnit = z
  .object({
    question: ConnectorDisplayQuestion.describe(
      "A forecast question answerable Yes or No for each placeholder substitution. Every placeholder in the question or condition must have a same-named variable, and every variable must be used as a placeholder.",
    ),
    variables: z
      .array(ConnectorTemplateVariable)
      .max(MAX_TEMPLATE_VARIABLES)
      .optional()
      .describe(
        "Use each variable's finite values to substitute into a same-named angle-bracket placeholder in the question or condition. Each resulting question is an individual Yes/No forecast.",
      ),
    condition: z
      .object({
        statement: ConditionStatement.describe(
          "Observable prerequisite with its own explicit cutoff, distinct from and no later than the forecast resolution deadline; a question mark is not required.",
        ),
        ifUnmet: z
          .enum([
            "annulled",
            "resolve-no",
            "resolve-yes",
            "resolve-50-50",
            "custom",
          ])
          .describe("Disposition if the prerequisite is established as unmet."),
        customIfUnmet: z
          .string()
          .trim()
          .max(500)
          .describe(
            "Specific user-defined disposition if the prerequisite is unmet; include any required outcome, cutoff, and reference value or source.",
          )
          .optional(),
      })
      .optional(),
  })
  .describe(
    "A forecast question with optional finite variables and prerequisite condition.",
  );

export type ConnectorDraftUnitT = z.infer<typeof ConnectorDraftUnit>;

/** Parse connector input through the complete domain schema. */
export function parseConnectorDraftUnit(unit: ConnectorDraftUnitT): DraftUnitT {
  return DraftUnit.parse(unit);
}
