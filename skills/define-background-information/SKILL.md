---
name: define-background-information
description: Research and draft neutral context and background information for a selected forecast specification after its resolution criteria are approved.
---

# Purpose

Use this skill after the selected unit, definitions, resolution sources, and
resolution criteria have all been approved. Give the user enough durable
historical, institutional, procedural, and domain context to understand the
forecast without changing the approved specification, predicting its result,
or turning explanatory references into settlement sources. Keep current news
in the separate optional workflow, which requires an explicit user opt-in.

Read [references/background-information-spec.md](references/background-information-spec.md)
before drafting or submitting background information. It defines the content,
source, payload, review, and final-approval requirements.

## Workflow

1. Confirm that exactly one forecast specification is in scope and its
   `resolution_criteria` stage is explicitly approved. Preserve its exact unit
   number, selected unit, definitions, resolution sources, and criteria.
2. Research the relevant, durable context. Prefer authoritative primary sources
   for institutional facts and reputable secondary sources when they materially
   improve the explanation. Favor established facts. Leave live-status updates
   and other short-lived developments for the separate optional news workflow.
3. Draft the complete background information described in the reference. Keep
   facts neutral and include only factors that help a reader understand what
   could affect the outcome. Do not estimate a probability or imply Yes/No.
4. Call `submit_background_information` once with the carried
   `forecast_specification_id`, exact selected unit and unit number, complete
   `background_information`, and a follow-up asking whether the user approves
   it or wants changes. Write both in the record's immutable `language_code`.
   Present the complete returned Markdown with the shared layout: selected
   unit, `---`, background information, `---`, follow-up. Translate
   renderer-generated labels and fixed UI text into the locked specification
   language. Insert missing separators as presentation formatting only.
5. The submission is pending. If the user requests a change, revise and resubmit
   the complete background-information payload. After the user explicitly
   approves it, call `approve_forecast_specification` with
   `stage: "background_information"`.
6. At the end of this workflow, show only the localized standard action menu:
   YAML in chat and as a download, JSON in chat and as a download, Markdown in
   chat and as a download, PDF as a download, or the optional recent-news
   timeline. Use `and`, not `or`, for the first three choices. Do not show
   the internal forecast specification ID, language code, approval payload, or
   repeat the forecast question. Do not run `define-relevant-news`
   automatically. If the user chooses news, continue with that skill only
   after the background approval is recorded.
7. When the user chooses one or more output numbers, call
   `get_approved_forecast_specification` internally once and provide every
   requested clean output without `forecast_specification_id` or
   `language_code`. For YAML, JSON, and Markdown, show the complete output in a
   correctly labeled fenced code block and place a download link for the
   matching file directly below it. For PDF, provide the download link.
   Then ask whether it looks correct; if not, ask what should change and revise
   the affected workflow stages before repeating the review. If news is
   approved, use the final rendering instructions in `define-relevant-news`.

## Guardrails

- When provided, background references are explanatory and non-binding. Never
  add them to, replace, or reorder the approved resolution-source hierarchy.
- Do not modify approved questions, placeholders, definitions, or criteria.
- Do not include advocacy, trading advice, probability estimates, or a claimed
  outcome.
- Prefer evergreen factual context. Keep transient current-status claims and
  recent news out of this stage; the optional news workflow is available only
  after the user explicitly opts in.
- Ask for clarification only when missing scope would make the background
  materially misleading. Do not invent missing facts.
