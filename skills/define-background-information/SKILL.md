---
name: define-background-information
description: Research and draft neutral context and background information for a selected forecast specification after its resolution criteria are approved.
---

# Purpose

Use this skill after the selected unit, definitions, resolution sources, and
resolution criteria have all been approved. Give the user enough factual
context to understand the forecast without changing the approved specification,
predicting its result, or turning explanatory references into settlement
sources.

Read [references/background-information-spec.md](references/background-information-spec.md)
before drafting or submitting background information. It defines the content,
source, payload, review, and final-approval requirements.

## Workflow

1. Confirm that exactly one forecast specification is in scope and its
   `resolution_criteria` stage is explicitly approved. Preserve its exact unit
   number, selected unit, definitions, resolution sources, and criteria.
2. Research the relevant, durable context. Prefer authoritative primary sources
   for institutional facts and reputable secondary sources when they materially
   improve the explanation. Favor established facts over live-status updates
   and other short-lived developments.
3. Draft the complete background information described in the reference. Keep
   facts neutral and include only factors that help a reader understand what
   could affect the outcome. Do not estimate a probability or imply Yes/No.
4. Call `submit_background_information` once with the carried
   `forecast_specification_id`, exact selected unit and unit number, complete
   `background_information`, and a follow-up asking whether the user approves
   it or wants changes. Present the tool's complete returned Markdown faithfully,
   translating only renderer-generated labels and fixed UI text into the user's
   language.
5. The submission is pending. If the user requests a change, revise and resubmit
   the complete background-information payload. After the user explicitly
   approves it, call `approve_forecast_specification` with
   `stage: "background_information"`.
6. Present the complete rendered forecast specification returned by final
   approval, including the selected unit, approved definitions, resolution
   sources, resolution criteria, and context/background information. Do not
   summarize or truncate it. If the response is incomplete, immediately call
   `get_approved_forecast_specification` with the returned identifier and present
   that complete rendering.

## Guardrails

- When provided, background references are explanatory and non-binding. Never
  add them to, replace, or reorder the approved resolution-source hierarchy.
- Do not modify approved questions, placeholders, definitions, or criteria.
- Do not include advocacy, trading advice, probability estimates, or a claimed
  outcome.
- Prefer evergreen factual context and omit transient current-status claims.
- Ask for clarification only when missing scope would make the background
  materially misleading. Do not invent missing facts.
