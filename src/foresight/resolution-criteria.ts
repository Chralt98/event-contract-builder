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

const QuestionIdentity = DisplayQuestion.describe(
  "The exact question being resolved, including its placeholders.",
);

/** The current open-text rule plus the legacy structured form accepted for older clients. */
export const QuestionResolutionRule = z.union([
  z.strictObject({
    question: QuestionIdentity,
    outcomeCriteria: ResolutionText.describe(
      "Complete user-facing outcome criteria prose, including the Yes rule, the concise No complement, relevant resolution deadline, and source references. The wording is open; do not require a fixed lead-in phrase.",
    ),
  }),
  z.strictObject({
    question: QuestionIdentity,
    resolvesYesWhen: ResolutionText.describe(
      "Necessary and sufficient conditions under which this question resolves Yes for every allowed value and combination.",
    ),
    resolvesNoWhen: ResolutionText.describe(
      "Concise complement of the complete Yes rule for every allowed value and combination: the question resolves No when the necessary-and-sufficient Yes condition is not met by the deadline.",
    ),
  }),
]);

/**
 * The schema structures only the universal parts of resolution. The actual
 * decision logic remains open text so forecasts can use comparisons,
 * occurrences, rankings, calculations, classifications, combinations, or any
 * other source-grounded method that fits the question.
 */
const sharedResolutionCriteria = {
  questionRule: QuestionResolutionRule.describe(
    "One complete outcome rule for the exact question. Apply it to every allowed placeholder substitution; do not turn variable values into answer choices within one multi-outcome question.",
  ),
  exceptionAndUnresolvedRules: ResolutionText.describe(
    "How applicable boundary cases, ties, multiple or absent matches, postponements, cancellations, and otherwise unresolved states are handled; include only relevant cases.",
  ),
};

const CurrentResolutionCriteria = z.strictObject({
  ...sharedResolutionCriteria,
  resolutionSources: ResolutionText.describe(
    "Which approved resolution sources govern the outcome and their applicable priority. Refer only to the previously approved source records; do not introduce or change sources here.",
  ),
  resolutionMethod: ResolutionText.describe(
    "How to locate, read, and apply evidence from the approved resolution sources, including relevant queries, fields, releases, corrections, and the resolution deadline.",
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

/** Older approved criteria used one combined field for sources and method. */
const LegacyResolutionCriteria = z.object({
  ...sharedResolutionCriteria,
  evidenceAndSourceRules: ResolutionText.describe(
    "Legacy combined source and method instructions retained for older criteria.",
  ),
  conditionCriteria: ConditionResolutionCriteria.optional().describe(
    "Legacy prerequisite criteria retained when reading old data.",
  ),
});

export const ResolutionCriteria = z
  .union([CurrentResolutionCriteria, LegacyResolutionCriteria])
  .describe(
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
