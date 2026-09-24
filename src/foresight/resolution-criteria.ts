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

/** One complete Yes/No rule for the selected unit and all its allowed values. */
export const QuestionResolutionRule = z
  .object({
    question: DisplayQuestion.describe(
      "The exact selected-unit question, including its placeholders; this single rule applies uniformly to every allowed value and combination.",
    ),
    resolvesYesWhen: ResolutionText.describe(
      "Necessary and sufficient conditions under which this question resolves Yes for every allowed value and combination.",
    ),
    resolvesNoWhen: ResolutionText.describe(
      "Concise complement of the complete Yes rule for every allowed value and combination: the question resolves No when the necessary-and-sufficient Yes condition is not met by the deadline. Do not enumerate the Yes elements again as separate negative conditions.",
    ),
  })
  .strict();

/**
 * The schema structures only the universal parts of resolution. The actual
 * decision logic remains open text so forecasts can use comparisons,
 * occurrences, rankings, calculations, classifications, combinations, or any
 * other source-grounded method that fits the question.
 */
export const ResolutionCriteria = z
  .object({
    questionRule: QuestionResolutionRule.describe(
      "One complete Yes/No rule for the exact selected unit question. Refer to its declared placeholders or outcome values as needed; do not create a separate question or rule for each value.",
    ),
    evidenceAndSourceRules: ResolutionText.describe(
      "What public evidence determines the outcome and how the approved source hierarchy is applied, including corrections, revisions, conflicts, or unavailable evidence when relevant.",
    ),
    exceptionAndUnresolvedRules: ResolutionText.describe(
      "How applicable boundary cases, ties, multiple or absent matches, postponements, cancellations, and otherwise unresolved outcomes are handled; include only cases relevant to this unit.",
    ),
  })
  .describe(
    "Source-grounded Yes/No resolution criteria for the exact selected unit question, covering all of its declared values and combinations with one rule.",
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
    if (resolutionCriteria.questionRule.question !== selectedUnit.question) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "questionRule", "question"],
        message:
          "questionRule.question must exactly match selectedUnit.question.",
      });
    }
  });

/**
 * Parse connector input and, when available, verify the exact selected question.
 */
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
