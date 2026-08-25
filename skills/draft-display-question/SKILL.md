---
name: draft-display-question
description: Draft short prediction-market display questions from a new free-form event, forecast, or outcome; do not use for selecting questions that already exist.
---

# Purpose

Use this skill when the user describes a new event, forecast, or outcome and wants trader-facing Yes/No display questions.

The workflow expects a free-form event description and produces one or more concise questions organized into selectable binary, scalar, or categorical market units.

## Workflow

1. Read [references/drafting-spec.md](references/drafting-spec.md) before drafting or handling a selection. It contains the writing rules, market decomposition, output schema, and guard conditions.
2. Decide whether the input describes a new event or selects/confirms questions from an existing draft.
3. For a new event, identify the event, outcome, and future resolution period. If any is too vague, ask for clarification and stop.
4. Draft the questions according to the reference, organize them into selectable units, and call `submit_drafted_questions` exactly once. Present the tool's complete returned Markdown verbatim, including every unit, question, and follow-up; do not summarize it.
5. For an existing-question selection, do not generate or restate questions. Respond only with `Defining the terms in the selected unit now.` and hand off to the `define-terms` skill with the selected unit; no MCP tool is needed for this handoff.

## Boundaries

- Do not invent a missing event, resolution date, threshold, option, or factual outcome. Sensible ranges or options may be inferred only when the event and time period are clear and the user did not provide them.
- Treat scalar and categorical markets as complete units; do not let a selection address only part of one group.
- Keep questions future-facing, concise, conversational, and within the reference's character limits.
- Do not call `submit_drafted_questions` for a selection or when the input is too vague to draft.
