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
4. Only after `submit_selected_unit` succeeds, approve `selected_unit`; never
   call approval to create or persist the selection. The user's choice from the
   draft is explicit confirmation of the submitted selection.
5. Continue immediately with `define-terms` after selected-unit approval.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals. A source-review alternative remains only a
proposal until selected; once selected, start it as a new record and do not
reuse the original unit's definitions or sources.
