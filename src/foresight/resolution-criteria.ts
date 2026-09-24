import { z } from "zod";
import {
  categoricalOutcomeVariable,
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

/** The complete Yes/No rule for one binary question. */
const BinaryQuestionResolutionRule = z
  .object({
    question: DisplayQuestion.describe(
      "The exact binary question being resolved; when variables are present, the rule applies uniformly to every allowed substitution.",
    ),
    resolvesYesWhen: ResolutionText.describe(
      "Necessary and sufficient conditions under which this question resolves Yes.",
    ),
    resolvesNoWhen: ResolutionText.describe(
      "Concise complement of the complete Yes rule: the question resolves No when the necessary-and-sufficient Yes condition is not met by the deadline. Do not enumerate the Yes elements again as separate negative conditions.",
    ),
  })
  .strict();

/** One allowed categorical value paired with its own binary Yes/No question. */
const CategoricalOutcomeQuestionRule = BinaryQuestionResolutionRule.extend({
  outcome: z
    .string()
    .trim()
    .min(1)
    .describe("Exact value from the selected unit's categorical outcome list."),
}).strict();

/** One Yes/No question-rule per allowed value of the categorical question. */
const CategoricalQuestionResolutionRule = z
  .object({
    question: DisplayQuestion.describe(
      "Exact categorical question from the selected unit.",
    ),
    outcomeQuestionRules: z
      .array(CategoricalOutcomeQuestionRule)
      .min(2)
      .describe(
        "One binary Yes/No question and its resolution rule for each allowed categorical outcome value.",
      ),
  })
  .strict();

export const QuestionResolutionRule = z.union([
  BinaryQuestionResolutionRule,
  CategoricalQuestionResolutionRule,
]);

/**
 * Resolution criteria for a binary question or the per-category binary
 * questions represented by a categorical unit.
 *
 * The schema structures only the universal parts of resolution. The actual
 * decision logic remains open text so forecasts can use comparisons,
 * occurrences, rankings, calculations, classifications, combinations, or any
 * other source-grounded method that fits the question.
 */
export const ResolutionCriteria = z
  .object({
    questionRule: QuestionResolutionRule.describe(
      "The complete rule for the exact selected question: one Yes/No rule for a binary unit, or one binary Yes/No question and rule for each allowed categorical value.",
    ),
    evidenceAndSourceRules: ResolutionText.describe(
      "What public evidence determines the outcome and how the approved source hierarchy is applied, including corrections, revisions, conflicts, or unavailable evidence when relevant.",
    ),
    exceptionAndUnresolvedRules: ResolutionText.describe(
      "How applicable boundary cases, ties, multiple or absent matches, postponements, cancellations, and otherwise unresolved outcomes are handled; include only cases relevant to this unit.",
    ),
  })
  .describe(
    "Source-grounded Yes/No resolution criteria for one binary question or each category of a categorical forecast specification unit.",
  );

/** The open domain shape is already safe for connector JSON schemas. */
export const ConnectorResolutionCriteria = ResolutionCriteria;

export type ResolutionCriteriaT = z.infer<typeof ResolutionCriteria>;
export type ConnectorResolutionCriteriaT = ResolutionCriteriaT;

function questionsForUnit(unit: DraftUnitT): string[] {
  return [unit.question];
}

const ResolutionCriteriaForUnit = z
  .object({
    selectedUnit: DraftUnit,
    resolutionCriteria: ResolutionCriteria,
  })
  .superRefine(({ selectedUnit, resolutionCriteria }, ctx) => {
    const expected = questionsForUnit(selectedUnit);
    const rule = resolutionCriteria.questionRule;
    const actual = [rule.question];
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
        path: ["resolutionCriteria", "questionRule", "question"],
        message: `questionRule must cover the selected unit exactly (${details}).`,
      });
    }

    const outcomeVariable = categoricalOutcomeVariable(selectedUnit);
    if (outcomeVariable) {
      if (!("outcomeQuestionRules" in rule)) {
        ctx.addIssue({
          code: "custom",
          path: ["resolutionCriteria", "questionRule"],
          message:
            "A categorical unit requires one binary Yes/No question rule for every allowed outcome value.",
        });
      } else {
        const expectedOutcomes = outcomeVariable.values;
        const actualOutcomes = rule.outcomeQuestionRules.map(
          ({ outcome }) => outcome,
        );
        const duplicateOutcomes =
          new Set(actualOutcomes).size !== actualOutcomes.length;
        const missingOutcomes = expectedOutcomes.filter(
          (outcome) => !actualOutcomes.includes(outcome),
        );
        const unexpectedOutcomes = actualOutcomes.filter(
          (outcome) => !expectedOutcomes.includes(outcome),
        );
        const outcomeQuestions = rule.outcomeQuestionRules.map(
          ({ question }) => question,
        );
        const duplicateQuestions =
          new Set(outcomeQuestions).size !== outcomeQuestions.length;
        if (
          duplicateOutcomes ||
          missingOutcomes.length ||
          unexpectedOutcomes.length ||
          duplicateQuestions
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "resolutionCriteria",
              "questionRule",
              "outcomeQuestionRules",
            ],
            message: `Category question rules must cover the selected unit's allowed values exactly (${[
              ...(missingOutcomes.length
                ? [`missing outcomes: ${missingOutcomes.join(", ")}`]
                : []),
              ...(unexpectedOutcomes.length
                ? [`unexpected outcomes: ${unexpectedOutcomes.join(", ")}`]
                : []),
              ...(duplicateOutcomes ? ["duplicate outcomes"] : []),
              ...(duplicateQuestions
                ? ["category questions must be unique"]
                : []),
            ].join("; ")})`,
          });
        }
      }
    } else if ("outcomeQuestionRules" in rule) {
      ctx.addIssue({
        code: "custom",
        path: ["resolutionCriteria", "questionRule"],
        message:
          "Category question rules require a selected unit with an unreferenced finite outcome variable.",
      });
    }
  });

/**
 * Parse connector input and, when the selected unit is available, verify that
 * a categorical unit has exactly one Yes/No rule per allowed value.
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
