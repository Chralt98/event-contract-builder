---
name: draft-display-question
description: Draft a forecast specification display question from a new free-form event, forecast, or outcome.
---

# Draft display question

Read [references/drafting-spec.md](references/drafting-spec.md) for the drafting,
template, numeric range, and App presentation rules.
For this term's meaning, see the [forecast domain glossary](../../GLOSSARY.md).

1. Distinguish a new event from an update to an existing draft. Ask for missing
   event or outcome information rather than guessing. If only the horizon is
   unspecified, preserve that intent with the cutoff-date variable workflow in
   the reference and ask for values when needed; do not demand one fixed date.
2. For a new event, draft one forecast question unit as defined in the
   reference and call
   `submit_drafted_question` directly once; it creates the record and workspace.
   Do not create an empty workspace or fetch a stage review first.
3. For an update to an existing record, fetch its current question and revision
   with `get_forecast_stage_review` before generation or editing. Use its
   available commands through `execute_workspace_command`, following the
   server's shared workspace routing.
4. Submit the proposed forecast question with `submit_drafted_question`. Approval
   remains a separate explicit action. Follow the server's approval and
   Continue routing before `define-terms`.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals.
