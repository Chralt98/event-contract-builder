---
name: define-terms
description: Identify genuinely ambiguous terms in a selected forecast specification unit and propose precise definitions; use only after a user selects or confirms an existing unit.
---

# Purpose

Use this skill after a user selects, confirms, and approves a display-question
unit from an existing draft or selects the new
display-question unit offered inside an `alternative_forecast_specification` by the
resolution-source step. It expects the exact selected unit, its 1-based unit
number, and produces a glossary of only the terms that need clarification.

Read [references/definition-spec.md](references/definition-spec.md) before analyzing a unit. It contains the ambiguity criteria, exclusions, definition rules, and `submit_defined_terms` submission format.

## Workflow

1. Confirm that the input identifies exactly one unit. If the user selected an
   `alternative_forecast_specification`, use that alternative's new
   `display_question_unit` as the complete `selected_unit`, with its
   `unit_number` exactly as provided; do not reuse the original unit's
   definitions or source hierarchy. If the unit number or selected unit is
   missing or ambiguous, ask for clarification and stop. A scalar, categorical,
   or template selection always means the complete group, including every
   template variable and value. Confirm that the host has already submitted
   and explicitly approved this selected unit; if not, stop and return to the
   selection handoff without calling
   `submit_defined_terms`.
2. Analyze the exact selected unit for terms that a forecast user or resolution authority could reasonably interpret in more than one way.
3. Propose concise, dispute-resistant definitions without rewriting the selected questions.
4. After selected-unit approval has succeeded, call `submit_defined_terms`
   once with the carried `forecast_specification_id` when one is available, the unit number,
   exact selected unit, definitions map, and a follow-up asking whether the
   definitions should be changed. Use the record's immutable `language_code`
   for every definition and the follow-up. Preserve the returned identifier and
   language code for resolution-source review.
5. Present the complete returned Markdown as the user-facing glossary. Translate
   renderer-generated English labels and other fixed UI text into the locked
   specification language, preserving every term, definition, and follow-up.
   Use the shared layout: selected unit, `---`, definitions, `---`, follow-up.
   Insert a missing separator as presentation formatting only; do not alter
   glossary content or replace the response with a confirmation or follow-up alone.

The selected unit is supplied directly to this skill by the host workflow. Do not call a separate prompt-returning tool; the only MCP call in this workflow is `submit_defined_terms`.

## Boundaries

- Do not define obvious words or invent missing facts, data sources, authorities, reporting entities, deadlines, or observation periods.
- Do not rewrite, narrow, or otherwise modify the selected question(s), template placeholders, variables, or allowed values.
- Do not use this skill to draft new display questions; route new-event requests to `draft-display-question`.
- An alternative display-question unit selected from the resolution-source step
  is a valid new unit for this workflow, but its candidate sources remain
  provisional; after its definitions are agreed, route back to
  `define-resolution-source` to re-check them for the new unit.
- Do not call `submit_defined_terms` when the selected unit is unclear; ask for clarification when necessary. If no genuine ambiguity exists, submit an empty definitions map so the tool can render that result.
- Do not call `submit_defined_terms` while the selected unit is only pending;
  its approval must be complete first.
- If the unit came from a newly selected `alternative_forecast_specification`, omit the
  original forecast specification ID and start a separate saved record for that unit.
