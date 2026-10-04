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
3. Reopen an existing workspace before generation or selection. Use its revision
   and available commands through `execute_workspace_command`, following the
   server's shared workspace routing.
4. Submit a saved selection with `submit_selected_unit`, or execute the available
   `select_and_approve` command when the user explicitly approves that candidate.
   Follow the server's approval and Continue routing before `define-terms`.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals. A selected alternative or translated unit is
an explicit new record; do not reuse the original definitions or sources.
