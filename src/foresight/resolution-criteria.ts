import { z } from "zod";
import {
  ConditionStatement,
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

/** One complete Yes/No rule for the forecast outcome question. */
export const QuestionResolutionRule = z
  .object({
    question: DisplayQuestion.describe(
      "The exact question being resolved, including its placeholders; this single rule applies uniformly to every allowed value and combination.",
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
const BaseResolutionCriteria = z.object({
  questionRule: QuestionResolutionRule.describe(
    "One complete Yes/No rule for the exact outcome question. Refer to declared placeholders or outcome values as needed; do not create a rule for each value.",
  ),
  evidenceAndSourceRules: ResolutionText.describe(
    "What public evidence determines the outcome and how the approved source hierarchy is applied, including corrections, revisions, conflicts, or unavailable evidence when relevant.",
  ),
  exceptionAndUnresolvedRules: ResolutionText.describe(
    "How applicable boundary cases, ties, multiple or absent matches, postponements, cancellations, and otherwise unresolved states are handled; include only relevant cases.",
  ),
});

const ConditionResolutionCriteria = z
  .object({
    statement: ConditionStatement.describe(
      "The exact declarative prerequisite from the selected unit.",
    ),
    resolvesMetWhen: ResolutionText.describe(
      "Necessary and sufficient facts proving that the prerequisite is met.",
    ),
    resolvesUnmetWhen: ResolutionText.describe(
      "Facts establishing that the prerequisite is unmet. Lack of evidence is not enough; unresolved evidence belongs in exceptionAndUnresolvedRules.",
    ),
    evidenceAndSourceRules: ResolutionText.describe(
      "How the approved condition source hierarchy establishes the prerequisite state.",
    ),
    exceptionAndUnresolvedRules: ResolutionText.describe(
      "How ambiguous, unavailable, or conflicting condition evidence is handled.",
    ),
  })
  .strict();

export const ResolutionCriteria = BaseResolutionCriteria.extend({
  conditionCriteria: ConditionResolutionCriteria.optional().describe(
    "Separate rule for deciding whether the selected unit's declarative prerequisite is met or established as unmet; required only for a conditional unit.",
  ),
}).describe(
  "Source-grounded criteria for the selected outcome and, when present, its prerequisite.",
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
    if (selectedUnit.condition && !resolutionCriteria.conditionCriteria) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "conditionCriteria"],
        message: "Conditional units require conditionCriteria.",
      });
    }
    if (!selectedUnit.condition && resolutionCriteria.conditionCriteria) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "conditionCriteria"],
        message: "Unconditional units cannot have conditionCriteria.",
      });
    }
    if (
      selectedUnit.condition &&
      resolutionCriteria.conditionCriteria?.statement !==
        selectedUnit.condition.statement
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "conditionCriteria", "statement"],
        message:
          "conditionCriteria.statement must exactly match selectedUnit.condition.statement.",
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
