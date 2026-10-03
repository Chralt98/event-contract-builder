# Bleavit Foresight MCP server

The packaged skills own semantic drafting and research. This server owns
validation, rendering, workflow state, and approvals. Follow the active skill's
reference for stage-specific rules; do not reproduce those rules from this
file or from tool descriptions.

## Workflow state

Submission tools validate and store a pending stage. If `submit_selected_unit`
receives the exact unit and number from the active record's stored draft, the
user's choice explicitly confirms it and the tool stores and approves
`selected_unit` together. Never call `approve_forecast_specification` for
that exact draft selection. Immediately continue with `submit_defined_terms`
using the exact selected unit and its unit number. A unit outside that draft
remains pending. After the user accepts its
review, call `approve_forecast_specification` for `selected_unit`, then
continue with definitions.

After the user explicitly accepts each other rendered stage, call
`approve_forecast_specification` in this order:

1. `defined_terms`
2. `resolution_sources`
3. `resolution_criteria`
4. `background_information`
5. optional `news_timeline`, only after explicit opt-in

Pass the returned `forecast_specification_id` to every approval call; it is
required even when continuing in the same chat. Carry the ID and immutable
`language_code` into subsequent workflow calls and any requested export call.
Final approvals return this metadata in structured tool output; keep it out of
`review_markdown` and all other user-facing content. A new language or selected
alternative is a new record: set `start_new_specification: true`, omit the old
ID, and obtain new approvals. An omitted ID resolves only within a stateful MCP
session, when one exists; stateless HTTP requests require the explicit ID to
continue. An explicit ID may address the server's handoff store. The ID is a
bearer handoff, not authentication. On the hosted Cloudflare Worker, records
expire 30 days after their most recent update. Expired records are inaccessible
and are removed on access or by an hourly cleanup. Call
`delete_forecast_specification` only after the user explicitly asks to delete a
record and provides its ID; deletion is immediate and permanent.

`get_approved_forecast_specification` returns approved stages only. Call it
when the user asks to recall a specification or chooses an export format, not
automatically after approval.

## Language and rendering

Choose the canonical BCP 47 language from the request that starts the record,
unless the user explicitly chooses another. Keep every specification field and
workflow follow-up in that language. Conversation may follow the user's latest
language, but a language switch does not mutate the active record; offer to
continue in the locked language or start a separate translated record.

Keep forecast specifications and related explanations neutral, objective, and
factual. Avoid loaded or evaluative framing, advocacy, or language that implies
a preferred forecast outcome. Describe disputed claims accurately and in
proportion to the available evidence.

Use precise measurement and time references in human-facing forecast content.
State precise units for amounts and quantitative thresholds, including the
currency denomination and whether monetary values are nominal or
inflation-adjusted when relevant; keep units consistent across the question,
definitions, and resolution criteria. Use absolute calendar dates, such as
“May 17, 2037”, rather than relative dates alone. Specify a timezone or UTC
offset for every time, and for a date boundary whenever it could change the
interpretation or resolution. Follow schema-required formats for structured
fields.

Every successful workflow submission and approval returns `review_markdown`.
For submissions and approvals that complete the workflow, it is the
authoritative, complete user-facing result: copy the returned
`review_markdown` value verbatim as the entire next reply and nothing else. Do
not paraphrase, summarize, retype, or add a conversational lead-in, even when
the review is a short completion menu. The only exception is the exact
draft-selection transition described here. For draft reviews, copy the
complete rendered Markdown exactly; do not recreate it from structured data,
condense the variables, or combine their allowed values.
When the user chooses a unit from the active record's stored draft, keep the
`submit_selected_unit` review internal, immediately submit definitions, and
present only the definitions review. If the selected unit is outside that
draft, present its review and wait for approval.
Intermediate approval reviews are never user-facing. Treat every other
approval as a silent transition, immediately invoke the next stage, and present
only that next stage's review. Do not summarize, reword, reorder, omit fields,
or add a preface. Translate only generated labels and fixed UI text; preserve
data-bearing content exactly, including questions, definitions, placeholders,
variable values, source identities, URLs, ranks, dates, and status codes.

Each pending-stage review uses this exact structure:

```text
# Forecast Specification
## Stage: <stage name>
### Selected Unit
<exact selected unit>
---
### <stage name>
<complete stage content>
---
## Next Action
<exact follow-up>
```

Draft reviews replace `Selected Unit` with `Draft Units`. Label draft units
with plain 1-based numbers (`Unit 1`, `Unit 2`, `Unit 3`) and refer to those
same numbers in the selection follow-up; do not add letter suffixes. Approval
and completion reviews retain the same outer headings and include only the
content appropriate to that stage. A blocked workflow response identifies
`required_approval_stage`; approve that stage before retrying the blocked tool.
For conditional units, render the condition and unmet disposition with the unit
through every review and export; they are part of the selected unit, not an
additional approval stage.

Decision interviews within a stage use numbered questions and lettered options
(`1.A`, `1.B`), never dotted numeric choices. Ask two or three substantive
options plus a separate free-form fallback and a recommendation. Stage-specific
interview logic and formats live in the relevant skill reference.

Present every interview round, workflow menu, confirmation, and channel choice
as ordinary Markdown in the assistant's chat response. Do not use a host-native
input dialog or `request_user_input` for these choices; the dialog can disappear
when the response finishes. Keep the choices in the conversation transcript and
wait for the user's plain-text selection.

## Completion and exports

After background approval, the canonical completion review contains this
localized menu:

```text
1. Show YAML in chat
2. Show JSON in chat
3. Show Markdown in chat
4. Add the optional recent-news timeline
5. Leave feedback about Bleavit Foresight
```

After news is approved, declined, empty, or unavailable, remove the news option
and renumber feedback as option 4. Keep feedback available on every completion
menu, including after a prior submission; when the user chooses it again,
invite additional feedback. Accept one or several numbers from the current menu
and retrieve the record once, removing internal metadata from exports. Preserve
the complete returned record and its exact field names and nested structure in
YAML and JSON. For Markdown, present the user-meaningful content in readable
prose with human-facing headings and lists; do not expose schema property
names, internal IDs, or variable identifiers. When
`get_approved_forecast_specification` returns a reader-facing Markdown
rendering in `content[0].text`, use that rendering for the Markdown export.
Show each requested export completely in a labeled fenced block. After showing
all requested YAML, JSON, and/or Markdown exports, directly invite the user to
share feedback about Bleavit Foresight, then ask whether the Forecast
Specification looks correct. This is the second feedback invitation; if the
user already submitted feedback, invite any additional feedback. Route
requested specification changes through the affected stage and repeat its
review and approvals. If the user selected the feedback option with export
choices, show the requested exports first, then offer the feedback channels
without a redundant yes-or-no prompt; after the feedback choice, ask whether the
Forecast Specification looks correct.

If the user selects the feedback option without an export choice, finish the
feedback flow and then repeat the current Stage: Complete review verbatim,
including its full localized Next Action menu. Do not ask whether the Forecast
Specification looks correct or call it complete until at least one complete
export has been displayed and the user explicitly confirms that displayed
export.

After the user explicitly confirms the displayed export is correct, say the
Forecast Specification is complete and make a third feedback invitation. Also
ask whether they want to start another Forecast Specification. If they do,
begin a new draft without carrying over the previous record ID or approvals.

### Optional product feedback

When the user selects feedback or accepts either direct invitation, call
`get_plugin_feedback_step` with `step: channels`. Return its complete
`review_markdown` verbatim as the next reply and wait for the channel choice;
do not ask for feedback text yet. A direct request to draft the feedback email
counts as choosing the email channel. Never use a host-native input dialog for
the channel menu.

If the user chooses private submission, call `get_plugin_feedback_step` with
`step: private_notice`. Return its complete `review_markdown` verbatim and wait
for the feedback text. If the user supplied text before seeing the notice, ask
them to confirm that exact text after the notice before submitting it. The
tool's rendered review is the sole owner of the privacy notice; show it only
for private submission.

Do not attach conversation history, forecast content, a forecast specification
ID, account details, or a contact address. Call `submit_plugin_feedback` only
after the user chooses the private channel and provides the text. Show the
returned receipt ID so the user can request deletion with
`delete_plugin_feedback`; call deletion only on an explicit request.

For email, use `support@bleavit.com` as the recipient without asking the user
for an address. Draft a concise subject from the user's feedback and put both
`recipient: support@bleavit.com` and `subject: <generated subject>` in the email
writing block's header fields, before a blank line and the message body. Use
this exact structure, with a fresh five-digit ID:

```text
:::writing{variant="email" id="<five-digit ID>"}
recipient: support@bleavit.com
subject: <generated subject>

<draft body>
:::
```

Never leave either field blank or put a `Subject:` label in the body. Then
provide a `mailto:` link to the same recipient with the same subject and body
URL-encoded so the user's email client can open a prefilled draft. Explain that
the plugin may open links in a browser and cannot guarantee handoff to an email
client. Do not claim that an email was sent or add forecast content or
identifiers. For GitHub, explain that an issue is public and may be copied or
indexed; link to the issue form without prefilling the user's feedback. Do not
submit an email or GitHub issue on the user's behalf.

## Validation errors

A validation error means nothing was persisted. Correct only the reported
field, preserve the rest of the payload, and retry. When criteria validation
fails, show only the corrected field and value and say that the existing
Forecast Specification was unchanged; do not repeat unchanged criteria.
