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
   it with `open_active_forecast_draft`. An account can have one active specification,
   and each specification has one question unit. Classify the request against
   its active question: a change to the same event/outcome is an update that
   preserves the other stage content; a different event/outcome is a new
   specification. Never offer a second question unit or parallel
   specifications. For a new specification, ask whether to keep the active
   draft and set the request aside or replace the entire draft. Only after the
   user explicitly chooses whole-draft replacement, delete the active draft,
   then create a new workspace. Never submit a new event under the old
   specification ID.
2. For a new request, continue the exploration in chat. Research source
   feasibility and present viable question-unit options for the user to select
   and refine. Use `request_user_input_async` for material choices, then show
   the complete question unit as a text-chat proposal and iterate until the
   user explicitly approves the exact unit for entry. Do not create a
   workspace, prepare a stage, or open its App while the user is still deciding
   what to forecast.
3. For an update to the same event/outcome, clarify the intended change and
   source feasibility in chat
   until there is one concrete revised question unit. Fetch its current question
   and revision with `get_forecast_specification_stage_review` only after the user approves
   that revision for entry. If the current content materially changes it, return
   to chat and get approval for the revised unit before submission.
   Once reconciled, update the existing specification with
   `submit_drafted_question`; preserve its other stage content and follow the
   server's normal approval and impact-review rules.
4. For a new specification, create the workspace, prepare the stage, and submit
   only after the user approves one complete question unit for entry. Follow
   server-wide routing and submit that one unit with `submit_drafted_question`.
5. After chat approval, follow the server-wide transfer, approval, and
   continuation routing before `define-terms`. The App shows the approved
   question for review; do not ask the user to approve it a second time.

Follow the server-wide rules for language, internal metadata, rendering,
separate records, and approvals.
