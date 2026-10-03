---
name: draft-display-question
description: Draft short forecast specification display questions from a new free-form event, forecast, or outcome; do not use for selecting questions that already exist.
---

# Draft display questions

Read [references/drafting-spec.md](references/drafting-spec.md) for the drafting,
template, alternative-question, and selection rules.

1. Distinguish a new event from a selection of an existing draft. Ask for
   missing event, outcome, or future time information rather than guessing.
2. For a new event, draft the units defined in the reference and call
   `submit_drafted_questions` once.
3. For a selection, preserve the exact complete unit and its 1-based draft
   number. Call `submit_selected_unit` with the active record's ID and language;
   use the returned ID and language for the next step. For a selected alternative
   or translated unit, start a new record as described below.
4. When the exact unit and number match the active record's stored draft, the
   user's choice is approval: `submit_selected_unit` saves and approves it
   together. Do not call `approve_forecast_specification` for this selection;
   keep its transition review internal and continue directly with
   `define-terms`. A selection outside that draft remains pending; show its
   review, call `approve_forecast_specification` after user acceptance, then
   continue with definitions.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals. A selected alternative or translated unit is
a new record; do not reuse the original unit's definitions or sources.
