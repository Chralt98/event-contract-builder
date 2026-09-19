import { z } from "zod";
import { DraftUnit, type DraftUnitT } from "./display-question";

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

/** The complete Yes/No rule for one binary question in the selected unit. */
export const QuestionResolutionRule = z.object({
  question: z
    .string()
    .trim()
    .min(1)
    .describe(
      "Exact binary display question from the selected unit, or the exact placeholder-bearing question for a template unit; one template rule must apply uniformly to all allowed substitutions.",
    ),
  resolvesYesWhen: ResolutionText.describe(
    "Necessary and sufficient conditions under which this question resolves Yes.",
  ),
  resolvesNoWhen: ResolutionText.describe(
    "Concise complement of the complete Yes rule: the question resolves No when the necessary-and-sufficient Yes condition is not met by the deadline. Do not enumerate the Yes elements again as separate negative conditions.",
  ),
});

/**
 * Broad resolution criteria for every binary question represented by a
 * selected binary, scalar, categorical, or template unit.
 *
 * The schema structures only the universal parts of resolution. The actual
 * decision logic remains open text so forecasts can use comparisons,
 * occurrences, rankings, calculations, classifications, combinations, or any
 * other source-grounded method that fits the question.
 */
export const ResolutionCriteria = z
  .object({
    questionRules: z
      .array(QuestionResolutionRule)
      .min(1)
      .superRefine((rules, ctx) => {
        const questions = rules.map(({ question }) => question);
        if (new Set(questions).size !== questions.length) {
          ctx.addIssue({
            code: "custom",
            message:
              "questionRules must contain at most one rule for each exact question.",
          });
        }
      })
      .describe(
        "One complete Yes/No rule for every binary question in the selected unit; a template uses its exact placeholder-bearing question once and the same source, formula, procedure, and methodology for every allowed substitution.",
      ),
    evidenceAndSourceRules: ResolutionText.describe(
      "What public evidence determines the outcome and how the approved source hierarchy is applied, including corrections, revisions, conflicts, or unavailable evidence when relevant.",
    ),
    exceptionAndUnresolvedRules: ResolutionText.describe(
      "How applicable boundary cases, ties, multiple or absent matches, postponements, cancellations, and otherwise unresolved outcomes are handled; include only cases relevant to this unit.",
    ),
  })
  .describe(
    "Source-grounded resolution criteria for every binary question represented by one forecast specification unit.",
  );

/** The open domain shape is already safe for connector JSON schemas. */
export const ConnectorResolutionCriteria = ResolutionCriteria;

export type ResolutionCriteriaT = z.infer<typeof ResolutionCriteria>;
export type ConnectorResolutionCriteriaT = ResolutionCriteriaT;

function questionsForUnit(unit: DraftUnitT): string[] {
  switch (unit.type) {
    case "binary":
    case "template":
      return [unit.question];
    case "scalar":
    case "categorical":
      return unit.questions;
  }
}

const ResolutionCriteriaForUnit = z
  .object({
    selectedUnit: DraftUnit,
    resolutionCriteria: ResolutionCriteria,
  })
  .superRefine(({ selectedUnit, resolutionCriteria }, ctx) => {
    const expected = questionsForUnit(selectedUnit);
    const actual = resolutionCriteria.questionRules.map(
      ({ question }) => question,
    );
    const missing = expected.filter((question) => !actual.includes(question));
    const unexpected = actual.filter(
      (question) => !expected.includes(question),
    );

    if (missing.length > 0 || unexpected.length > 0) {
      const details = [
        ...(missing.length > 0
          ? [`missing exact questions: ${missing.join(" | ")}`]
          : []),
        ...(unexpected.length > 0
          ? [`questions outside the selected unit: ${unexpected.join(" | ")}`]
          : []),
      ].join("; ");
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "questionRules"],
        message: `questionRules must cover the selected unit exactly (${details}).`,
      });
    }
  });

/**
 * Parse connector input and, when the selected unit is available, verify that
 * every constituent binary question has exactly one rule.
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
