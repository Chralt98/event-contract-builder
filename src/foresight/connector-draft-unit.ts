import { z } from "zod";
import { DraftUnit, type DraftUnitT } from "./display-question";

/**
 * Connector-safe representation of a draft unit.
 *
 * Keep the wire schema flat and restore the domain invariants in the tool
 * handler. Every unit contains one question; variables are optional for a
 * standalone binary question.
 */
const ConnectorDisplayQuestion = z
  .string()
  .min(10)
  .max(200)
  .describe(
    "User-facing forecast question, ending in '?'; placeholders are optional when there are no variables.",
  );

const ConnectorTemplateVariable = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of one narrow, finite parameter such as a date, match, city, or candidate; do not use an open-ended event or outcome category.",
    ),
  values: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "Explicit closed set of concrete values. Every value and meaningful combination must share the same qualifying predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis.",
    ),
});

export const ConnectorDraftUnit = z
  .object({
    question: ConnectorDisplayQuestion.describe(
      "The forecast question; it may omit placeholders when variables are absent.",
    ),
    variables: z
      .array(ConnectorTemplateVariable)
      .optional()
      .describe(
        "Omit or use an empty list for a binary question. Otherwise provide one named finite variable per question placeholder; its values may be scalar ranges or categorical outcomes only when all values share one settlement framework.",
      ),
  })
  .describe("A forecast question with optional finite variables.");

export type ConnectorDraftUnitT = z.infer<typeof ConnectorDraftUnit>;

/** Parse connector input through the complete domain schema. */
export function parseConnectorDraftUnit(unit: ConnectorDraftUnitT): DraftUnitT {
  return DraftUnit.parse(unit);
}
