---
name: draft-display-question
description: Draft short forecast specification display questions from a new free-form event, forecast, or outcome; do not use for selecting questions that already exist.
---

# Purpose

Use this skill when the user describes a new event, forecast, or outcome and
wants user-facing Yes/No display questions. It also supplies new nearby,
proxy, or improved display-question units when the resolution-source workflow
cannot fully cover the originally selected forecast specification.

The workflow expects a free-form event description and produces at least three concise, distinct selectable forecast specification units organized as binary, scalar, categorical, or template units. The units should offer a direct reading of the user's intent plus close reformulation, proxy, or better-specified alternatives.

## Workflow

1. Read [references/drafting-spec.md](references/drafting-spec.md) before drafting or handling a selection. It contains the writing rules, forecast specification decomposition, output schema, and guard conditions.
2. Decide whether the input describes a new event or selects/confirms questions from an existing draft.
3. For a new event, identify the event, outcome, and future resolution period. If any is too vague, ask for clarification and stop. When `define-resolution-source` requests an alternative, use the original user intent and the stated source gap to identify a nearby, proxy, or improved event/question; do not turn the request into term definitions.
4. Draft the concrete questions according to the reference. For every new event, create at least three distinct selectable units: one direct interpretation and at least two close reformulations, measurable proxies, or better-specified interpretations that preserve the user's intent. A scalar or categorical group counts as one selectable unit even when it contains several questions. Add a template as an additional unit only when every explicit substitution preserves one qualifying predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis. A template never replaces one of the three substantive units, and a scalar or categorical unit does not require an unsafe template. A lone binary question may be complete as a domain unit, but it is not enough for a new-event draft. Before calling `submit_drafted_questions`, verify that the draft contains at least three distinct units and that every template has finite, narrow values satisfying the settlement-invariance rules in the reference; if any check fails, revise the draft and do not submit it. For a new-event draft, call `submit_drafted_questions` exactly once and present its complete returned Markdown faithfully, translating renderer-generated English labels and other fixed UI text into the user's language while preserving every question, variable name/value, and follow-up; do not summarize it. Preserve the returned `forecast_specification_id` so the selected-unit submission and approval can happen before `define-terms`. The immediate next stage after selection is `define-terms`. For a resolution-source alternative, return only the newly drafted display-question unit to that workflow so it can render it as a selectable `alternative_forecast_specification`; do not treat it as selected and do not include definitions.
5. For an existing-question selection, do not generate or restate questions.
   First call `submit_selected_unit` with the exact selected unit, its unit
   number, and the carried `forecast_specification_id` when available. Because the user's
   message is an explicit selection, immediately call
   `approve_forecast_specification` with `stage: "selected_unit"` and the same
   identifier. Only after that approval succeeds, hand the exact selected unit
   to `define-terms`. When the user selects
   an `alternative_forecast_specification`, start its separate record with
   `submit_selected_unit`, approve that new selected unit, run `define-terms`,
   and omit the original forecast specification ID.

## Boundaries

- Do not invent a missing event, resolution date, threshold, option, or factual outcome. Sensible ranges or options may be inferred only when the event and time period are clear and the user did not provide them.
- Treat scalar, categorical, and template forecast specifications as complete units; do not let a selection address only part of one group or choose one template value during selection.
- Keep the first new-event draft at three or more distinct selectable units. Do not count multiple questions inside one scalar/categorical group as separate units, and do not duplicate a unit merely to reach the minimum.
- Use templates only for finite, explicitly listed, narrow parameters. Every allowed value and meaningful combination must retain the same qualifying event predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis. If any of these differ, draft the affected cases as separate units; do not force a template to satisfy a template-count rule.
- A template may expose only values supported by the user's input or the concrete draft. Do not invent values merely to make a template.
- An alternative requested during resolution-source review must be new display-question wording, not a glossary, term-definition map, source hierarchy, or silent rewrite of the selected unit.
- Keep questions future-facing, concise, conversational, and within the reference's character limits.
- Do not call `submit_drafted_questions` for a selection or when the input is too vague to draft.
- When a user selects an alternative forecast specification unit, omit the original forecast specification ID so
  the new question begins a separate saved forecast specification record.
