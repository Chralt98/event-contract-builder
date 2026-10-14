import { z } from "zod";

/**
 * Resolution rules may need prose, formulas, source field names, or several
 * sentences. Keep their content open rather than imposing a closed taxonomy of
 * event types, comparators, or settlement methods.
 */
const ResolutionText = z
  .string()
  .trim()
  .min(1)
  .describe(
    "Precise resolution text; may contain prose, formulas, source fields, dates, thresholds, classifications, or other question-appropriate logic.",
  );

/** One editable, complete criteria text for the approved forecast question unit. */
export const ResolutionCriteria = z
  .strictObject({
    criteria: ResolutionText.describe(
      "One complete user-facing resolution-criteria text covering the outcome rules, approved resolution sources, resolution method, and relevant exceptions or unresolved outcomes.",
    ),
  })
  .describe(
    "One complete source-grounded Resolution Criteria text for the selected outcome and, when present, its conditional disposition.",
  );

/** The open domain shape is already safe for connector JSON schemas. */
export const ConnectorResolutionCriteria = ResolutionCriteria;

export type ResolutionCriteriaT = z.infer<typeof ResolutionCriteria>;
export type ConnectorResolutionCriteriaT = ResolutionCriteriaT;

/** Parse connector input as one complete criteria text. */
export function parseConnectorResolutionCriteria(
  criteria: ConnectorResolutionCriteriaT,
): ResolutionCriteriaT {
  return ResolutionCriteria.parse(criteria);
}
