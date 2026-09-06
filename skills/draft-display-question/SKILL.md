---
name: draft-display-question
description: Draft short prediction-market display questions from a new free-form event, forecast, or outcome; do not use for selecting questions that already exist.
---

# Purpose

Use this skill when the user describes a new event, forecast, or outcome and
wants trader-facing Yes/No display questions. It also supplies new nearby,
proxy, or improved display-question units when the resolution-source workflow
cannot fully cover the originally selected market.

The workflow expects a free-form event description and produces one or more concise questions organized into selectable binary, scalar, categorical, or template market units.

## Workflow

1. Read [references/drafting-spec.md](references/drafting-spec.md) before drafting or handling a selection. It contains the writing rules, market decomposition, output schema, and guard conditions.
2. Decide whether the input describes a new event or selects/confirms questions from an existing draft.
3. For a new event, identify the event, outcome, and future resolution period. If any is too vague, ask for clarification and stop. When `define-resolution-source` requests an alternative, use the original user intent and the stated source gap to identify a nearby, proxy, or improved event/question; do not turn the request into term definitions.
4. Draft the concrete questions according to the reference. When two or more related questions form a reusable family, append the additional template unit required by the reference; never replace the concrete units with it. For a new-event draft, call `submit_drafted_questions` exactly once and present its complete returned Markdown faithfully, translating renderer-generated English labels and other fixed UI text into the user's language while preserving every question, variable name/value, and follow-up; do not summarize it. For a resolution-source alternative, return only the newly drafted display-question unit to that workflow so it can render it as a selectable `alternative_market`; do not treat it as selected and do not include definitions.
5. For an existing-question selection, do not generate or restate questions. Respond only with `Defining the terms in the selected unit now.` and hand off to the `define-terms` skill with the selected unit; no MCP tool is needed for this handoff.

## Boundaries

- Do not invent a missing event, resolution date, threshold, option, or factual outcome. Sensible ranges or options may be inferred only when the event and time period are clear and the user did not provide them.
- Treat scalar, categorical, and template markets as complete units; do not let a selection address only part of one group or choose one template value during selection.
- A template may expose only values supported by the user's input or the concrete draft. Do not invent values merely to make a template.
- An alternative requested during resolution-source review must be new display-question wording, not a glossary, term-definition map, source hierarchy, or silent rewrite of the selected unit.
- Keep questions future-facing, concise, conversational, and within the reference's character limits.
- Do not call `submit_drafted_questions` for a selection or when the input is too vague to draft.
