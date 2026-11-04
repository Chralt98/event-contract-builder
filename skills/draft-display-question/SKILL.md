---
name: draft-display-question
description: Draft a forecast specification display question from a new free-form event, forecast, or outcome.
---

# Draft display question

Read [references/drafting-spec.md](references/drafting-spec.md) for chat-first
exploration, source feasibility, drafting, numeric range, and App presentation.
For this term's meaning, see the [forecast domain glossary](../../GLOSSARY.md).

1. Start by clarifying the user's intended event, outcome, horizon, condition,
   and finite values in chat. Use `request_user_input_async` for unresolved
   material choices about these elements, including condition cutoffs and the
   unmet-condition disposition. Once the intended forecast is concrete enough to
   classify, check for an active draft with `list_forecast_specifications` and open
   it with `open_forecast_specification_stage` with stage `forecast_question_unit`. An account can have one active specification,
   and each specification has one question unit. Classify the request against
   its active question: a change to the same event/outcome is an update that
   preserves the other stage content; a different event/outcome is a new
   specification. Never offer a second question unit or parallel
   specifications. For a new specification, ask whether to keep the active
   draft and set the request aside or replace the entire draft. Only after the
   user explicitly chooses whole-draft replacement, delete the active draft,
   then create a new workspace. Never submit a new event under the old
   specification ID.
2. Explore the event and source feasibility in chat until one complete question
   unit expresses the user's intent.
3. Create a workspace for a new specification or review the existing Question
   for an update. Prepare Question and submit a complete revision-bound
   proposal. Preserve other stage content on updates.
4. Present the exact proposal in chat and follow the server-wide
   [proposal, approval, and continuation routing](../../src/foresight/instructions.md#workflow-state).
   The App shows the approved question after exact approval.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals.
