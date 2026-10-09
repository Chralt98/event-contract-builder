import { z } from "zod";
import {
  DisplayQuestion,
  DraftUnit,
  type DraftUnitT,
} from "./display-question";

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

const QuestionIdentity = DisplayQuestion.describe(
  "The exact question being resolved, including its placeholders.",
);

/** One editable, complete criteria text bound to its exact approved question. */
export const ResolutionCriteria = z
  .strictObject({
    question: QuestionIdentity.describe(
      "The exact question being resolved, including its placeholders.",
    ),
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

const ResolutionCriteriaForUnit = z
  .object({
    selectedUnit: DraftUnit,
    resolutionCriteria: ResolutionCriteria,
  })
  .superRefine(({ selectedUnit, resolutionCriteria }, ctx) => {
    if (resolutionCriteria.question !== selectedUnit.question) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "question"],
        message:
          "The criteria question must exactly match selectedUnit.question.",
      });
    }
  });

/** Parse connector input and verify it matches the selected outcome and condition. */
export function parseConnectorResolutionCriteria(
  criteria: ConnectorResolutionCriteriaT,
  selectedUnit?: DraftUnitT,
): ResolutionCriteriaT {
  if (!selectedUnit) return ResolutionCriteria.parse(criteria);

  return ResolutionCriteriaForUnit.parse({
    selectedUnit,
    resolutionCriteria: criteria,
  }).resolutionCriteria;
}
