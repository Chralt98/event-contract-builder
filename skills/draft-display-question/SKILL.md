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
3. For a selection, preserve the exact complete unit, call
   `submit_selected_unit`, then approve `selected_unit` because the selection
   itself is the user's explicit confirmation.
4. Continue immediately with `define-terms` after selected-unit approval.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals. A source-review alternative remains only a
proposal until selected; once selected, start it as a new record and do not
reuse the original unit's definitions or sources.
