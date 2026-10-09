# Bleavit Foresight MCP server

The packaged skills own semantic drafting and research. This server owns
validation, rendering, workflow state, and approvals. Follow the active skill's
reference for stage-specific rules; do not reproduce those rules from this
file or from tool descriptions.

## Workflow state

Submission tools validate and store a pending stage.
All six stages use one revision-bound workspace for app and core clients:
`create_question_workspace` starts an incomplete draft; `execute_workspace_command`
reopens an editable stage and performs edits, proposals, Apply/Discard, approval, or Continue. Include `stage` when reopening any stage after Question.
Use commands returned in `workspace.presentation.actions`; replace editable
payloads as needed and use a fresh command ID for a new operation. Preserve the
same command ID and payload when retrying a lost acknowledgement.

For a new model-generated question, call `submit_drafted_questions` directly;
it creates the record and workspace. Do not call `create_question_workspace`
first. Use `create_question_workspace` only when the user wants an empty
workspace for manual entry. On an existing record, pass the revision fetched
before generation; later output is stored as a proposal.
Applying a proposal changes the draft without approving it. `submit_selected_unit`
saves a pending selection with the current workspace revision. A user's explicit
select-and-approve request may execute `select_and_approve` on the exact saved
candidate instead. Selection or editing alone does not approve content.

For stage submissions after Question, fetch the stage with
`get_forecast_stage_review` before generation and pass its exact revision and
prerequisite bindings. Generation fills an untouched stage; subsequent output
is a revision-bound proposal. Submit the complete stage payload. These tools
and `approve_forecast_specification` adapt to the same workspace commands; use
the returned actions for edits, proposal decisions, approval, and continuation.

For every approval, pass the exact `expected_revision` and
`prerequisite_revisions` from the reviewed result. Missing or stale bindings
require a fresh review (`get_forecast_stage_review` for a saved stage, or a
workspace `reopen`), reconciliation, and retry; never infer the bindings from
conversation memory. Preserve local edits on conflict. An incomplete draft may
be saved with validation issues, but approval requires valid selected content.
Keep the approved snapshot distinct from pending edits; outdated dependent work
requires renewed review before export.

Request AI suggestions only when the user selects Suggest or asks for changes.
Continue validates and advances without automatically reviewing the completed
stage or waiting for a model response. Keep stage-specific research and
post-approval procedures in the corresponding skill reference.

Treat “approve”, “continue”, “I'm okay with it”, “looks good”, or similar assent
as acceptance of the current reviewed stage when the referent is clear. Use its latest tool
bindings to approve the exact reviewed content, then execute its enabled
`continue` action and follow the returned next-stage instruction in the same
turn. Do not require a button click or a separate Continue request. A pending
proposal still requires a clear choice of the draft or suggestion; do not
silently apply suggestions. Optional News still requires explicit opt-in.
Content presented in the loaded app counts as reviewed content; the user may
accept it in chat without having it repeated there.

After background approval, open the News workspace to record the user's optional
choice with `set_news_choice`. Save `opted_in` before researching or generating
news. Save `declined` when the user skips news; after opted-in research, save
`unavailable` when nothing qualifies or nothing is selected. These choices
preserve a background-only record, without approving an empty timeline. Renew
the choice against the current prerequisites after upstream changes. Timeline
removal follows the News skill reference.

When a concrete proposal exists, keep the user in the decision flow. In the
MCP App, keep the normal draft editor above the read-only suggestion. The user
may copy individual suggested text values to the clipboard and paste them into
the editor; copying never changes the draft. Continue confirms the editable
draft, discards the pending proposal, and follows the stage workflow without
an additional Continue request. In text-only core chat, the user's acceptance
of the exact displayed selection also authorizes continuation. If there is no
proposal, report that no actionable improvement was found and keep the draft available.
Execute the available `continue` command when the user requests progression,
then follow its returned chat instruction. A Continue intent or successful message delivery does not
establish that generation has started or finished. If app messaging is
unavailable, present the equivalent chat request.

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
Choose one presentation surface for the current stage. When the client supports
MCP Apps and the tool advertises a UI resource, use that app for the complete
review, menus, and actions, including the first draft. The submission tool
opens or updates its associated app; do not require an app to be already loaded
for the record or revision, and do not create an empty workspace first.
An app-directed tool response also selects this surface. Chat may briefly guide
the next decision or add information absent from the app; never repeat the
complete question, stage content, or menu there. App availability is a display
signal, not approval or a substitute for current tool bindings. Use the complete
chat fallback when the client lacks app support or reports that the app failed
to open or render the result; a closed or previously stale app alone does not
establish failure. Reopen the saved stage to obtain its current review when
recovering in chat.

In chat-only mode, `review_markdown` is the authoritative, complete user-facing
result: copy it verbatim, without recreating fields from structured data,
condensing variables, or combining their allowed values. All workspace reviews
use their shared presentation fields, sections, and available actions; they
replace the legacy draft-review layout below. Apply this surface choice to
submissions, completion menus, exports, and feedback reviews as well.
Intermediate approval reviews after the question stage are never user-facing.
Treat these approvals as a silent transition, immediately invoke the next stage,
and present only that next stage's review on the chosen surface. Do not summarize,
reword, reorder, omit fields, or add a preface. Translate only generated labels and fixed UI text; preserve
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

Present interviews that have no app control as ordinary Markdown in chat.
Use the chosen presentation surface for workflow menus, confirmations, and
channel choices. Do not use a host-native input dialog or `request_user_input` for these choices; the dialog can disappear
when the response finishes. Keep chat-only choices in the conversation transcript
and wait for the user's plain-text selection.

## Completion and exports

After background approval, open the `news_timeline` workspace and let the user
choose whether to include optional news. Once that choice and any opted-in
timeline are approved, call `execute_completion_command` with `kind: reopen`
to obtain the completion menu and current revision. Its available actions derive
from saved approvals and the optional-news choice; accept one or several numbers
from that menu. News research still requires explicit opt-in. Feedback remains
available after prior submissions; invite additional feedback when selected again.

For requested YAML, JSON, and/or Markdown, call `execute_completion_command` with
`kind: export`, the requested `formats`, and the reopened `expected_revision`.
Present the result using the Language and rendering rules above. Exporting saves
the displayed approved revision as complete. The server excludes internal metadata and
outdated approvals. Route requested changes through the affected stage and its
approvals, then display new exports.

If feedback was selected with exports, display the exports first and then offer
the feedback channels without a redundant yes-or-no prompt. If feedback was
selected alone, finish that flow and reopen the completion menu. A requested
specification change goes through the affected stage and its approvals before a
new export is generated. Start another specification as a new record in the
requested language, without carrying over its predecessor's ID or approvals.

### Optional product feedback

When the user selects feedback or accepts either direct invitation, call
`get_plugin_feedback_step` with `step: channels`. Present the result using the
Language and rendering rules above and wait for the channel choice; do not ask for feedback text yet. A direct request to draft the feedback email
counts as choosing the email channel. Never use a host-native input dialog for
the channel menu.

If the user chooses private submission, call `get_plugin_feedback_step` with
`step: private_notice`. Present it using the Language and rendering rules above
and wait for the feedback text. If the user supplied text before seeing the notice, ask
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

A rejected submission or command leaves that operation unapplied. Workspace
drafts can still be saved with field validation issues; those issues block
approval, not autosave. Correct only the reported field, preserve the rest of the payload, and retry. When criteria validation
fails, show only the corrected field and value and say that the existing
Forecast Specification was unchanged; do not repeat unchanged criteria.
