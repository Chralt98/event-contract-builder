import { z } from "zod";
import {
  ConditionStatement,
  DraftUnit,
  type DraftUnitT,
} from "./display-question";

/**
 * Connector-safe representation of a draft unit.
 *
 * Keep the wire schema flat and restore the domain invariants in the tool
 * handler. Variables may substitute into question placeholders or describe
 * categorical outcomes that are listed beside the question.
 */
const ConnectorDisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  .describe(
    "User-facing forecast question, ending in '?'; categorical outcome values may be listed without appearing as placeholders.",
  );

const ConnectorTemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of one narrow, finite parameter or outcome dimension such as a date, match, city, candidate, or party.",
    ),
  values: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "Explicit closed set of values. Values may fill a same-named placeholder or define categorical outcomes without appearing in the question. Every value and meaningful combination must share the same condition and unmet disposition, qualifying predicate, interpretation, sources, formula, procedure, methodology, and legal/compliance analysis.",
    ),
});

export const ConnectorDraftUnit = z
  .object({
    question: ConnectorDisplayQuestion.describe(
      "The forecast question. Any placeholder in this question or its condition must have a same-named variable; categorical outcome variables need not appear as placeholders.",
    ),
    variables: z
      .array(ConnectorTemplateVariable)
      .optional()
      .describe(
        "Use variables for question parameters or categorical outcome values. A categorical question has one unreferenced outcome variable; every question placeholder must have a same-named variable.",
      ),
    condition: z
      .object({
        statement: ConditionStatement.describe(
          "Observable prerequisite with its own explicit cutoff, distinct from and no later than the forecast resolution deadline; a question mark is not required.",
        ),
        ifUnmet: z
          .enum(["annulled", "resolve-no"])
          .describe("Disposition if the prerequisite is established as unmet."),
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
