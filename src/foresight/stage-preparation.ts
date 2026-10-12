import { z } from "zod";
import { approvalStageSchema, type ApprovalStage } from "./workflow";
import glossary from "../../GLOSSARY.md" with { type: "text" };
import forecast_question_unitSkill from "../../skills/draft-display-question/SKILL.md" with { type: "text" };
import forecast_question_unitReference0 from "../../skills/draft-display-question/references/drafting-spec.md" with { type: "text" };
import defined_termsSkill from "../../skills/define-terms/SKILL.md" with { type: "text" };
import defined_termsReference0 from "../../skills/define-terms/references/definition-spec.md" with { type: "text" };
import resolution_sourcesSkill from "../../skills/define-resolution-source/SKILL.md" with { type: "text" };
import resolution_sourcesReference0 from "../../skills/define-resolution-source/references/source-spec.md" with { type: "text" };
import resolution_criteriaSkill from "../../skills/define-resolution-criteria/SKILL.md" with { type: "text" };
import resolution_criteriaReference0 from "../../skills/define-resolution-criteria/references/criteria-spec.md" with { type: "text" };
import resolution_criteriaReference1 from "../../skills/define-resolution-criteria/references/criteria-validation.md" with { type: "text" };
import background_informationSkill from "../../skills/define-background-information/SKILL.md" with { type: "text" };
import background_informationReference0 from "../../skills/define-background-information/references/background-information-spec.md" with { type: "text" };
import news_timelineSkill from "../../skills/define-relevant-news/SKILL.md" with { type: "text" };
import news_timelineReference0 from "../../skills/define-relevant-news/references/news-timeline-spec.md" with { type: "text" };

const InstructionDocument = z.strictObject({
  path: z.string().min(1),
  content: z.string().min(1),
});
export const PreparationReceipt = z
  .uuid()
  .describe(
    "Receipt from current stage preparation; reuse until the server requires a refresh.",
  );
export const OptionalPreparationReceipt = PreparationReceipt.optional();
export const StagePreparation = z.strictObject({
  stage: approvalStageSchema,
  preparation_receipt: PreparationReceipt,
  content_version: z.string().regex(/^[a-f0-9]{64}$/),
  server_version: z.string().regex(/^[a-f0-9]{64}$/),
  server_instructions: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Shared instructions; omitted when a valid previous receipt establishes that this version was already delivered.",
    ),
  skill: InstructionDocument,
  references: z.array(InstructionDocument).min(1),
});
export type StagePreparation = z.infer<typeof StagePreparation>;

/** Canonical stage materials are bundled from their owners, never copied. */
export const foresightStageMaterials: Record<
  ApprovalStage,
  Pick<StagePreparation, "skill" | "references">
> = {
  forecast_question_unit: {
    skill: {
      path: "skills/draft-display-question/SKILL.md",
      content: forecast_question_unitSkill,
    },
    references: [
      {
        path: "skills/draft-display-question/references/drafting-spec.md",
        content: forecast_question_unitReference0,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
  defined_terms: {
    skill: {
      path: "skills/define-terms/SKILL.md",
      content: defined_termsSkill,
    },
    references: [
      {
        path: "skills/define-terms/references/definition-spec.md",
        content: defined_termsReference0,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
  resolution_sources: {
    skill: {
      path: "skills/define-resolution-source/SKILL.md",
      content: resolution_sourcesSkill,
    },
    references: [
      {
        path: "skills/define-resolution-source/references/source-spec.md",
        content: resolution_sourcesReference0,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
  resolution_criteria: {
    skill: {
      path: "skills/define-resolution-criteria/SKILL.md",
      content: resolution_criteriaSkill,
    },
    references: [
      {
        path: "skills/define-resolution-criteria/references/criteria-spec.md",
        content: resolution_criteriaReference0,
      },
      {
        path: "skills/define-resolution-criteria/references/criteria-validation.md",
        content: resolution_criteriaReference1,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
  background_information: {
    skill: {
      path: "skills/define-background-information/SKILL.md",
      content: background_informationSkill,
    },
    references: [
      {
        path: "skills/define-background-information/references/background-information-spec.md",
        content: background_informationReference0,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
  news_timeline: {
    skill: {
      path: "skills/define-relevant-news/SKILL.md",
      content: news_timelineSkill,
    },
    references: [
      {
        path: "skills/define-relevant-news/references/news-timeline-spec.md",
        content: news_timelineReference0,
      },
      { path: "GLOSSARY.md", content: glossary },
    ],
  },
};
