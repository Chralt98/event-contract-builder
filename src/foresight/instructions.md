# Bleavit Foresight MCP server

The packaged skills own semantic drafting and research. This server owns
validation, rendering, workflow state, and approvals. Follow the active skill's
reference for stage-specific rules; do not reproduce those rules from this
file or from tool descriptions.

## Workflow state

The user may open and edit any stage at any time; the stage menu is navigational
and must not disable later stages because earlier stages are incomplete. Opening
an untouched stage saves an incomplete draft. The customary path is Question,
Terms, Sources, Criteria, Background, then optional News, but it is guidance
rather than a required navigation sequence. Approval and Continue still require
the current prerequisite approvals; moving between stages never approves or
advances content.

Submission tools validate and store a pending stage. All six stages use one
revision-bound MCP App workspace. Shared core tools remain model-visible, but
hosts without MCP App support are unsupported for workflow reviews:
`create_question_workspace` starts an incomplete draft; `execute_workspace_command`
is used by the App to navigate to an editable stage and perform edits,
proposals, Apply/Discard, approval, or Continue. Model workflows fetch current
stage state with `get_forecast_stage_review`; this initializes untouched stages
and, on MCP App clients, opens or updates the requested stage in the App. Use
commands returned in `workspace.presentation.actions`; replace editable
payloads as needed and use a fresh command ID for a new operation. Preserve the
same command ID and payload when retrying a lost acknowledgement.

For a new model-generated question, call `submit_drafted_question` directly;
it creates the record and workspace. Do not call `create_question_workspace`
first. Use `create_question_workspace` only when the user wants an empty
workspace for manual entry. On an existing record, pass the revision fetched
before generation. The generator may replace its own latest draft while no
App edit has occurred since that generation. An App edit marks the draft as
user-edited; later generated output is then a revision-bound proposal.
Applying a proposal changes the draft without approving it. `submit_selected_unit`
saves a pending question with the current workspace revision. The App presents
the proposed question and its ranges for review. Editing alone does not approve
content.

For stage submissions after Question, finish the analysis before submitting,
prepare the complete payload, and use the exact revision and prerequisite
bindings from the latest workspace response. If those bindings are unavailable,
fetch only the target stage once with `get_forecast_stage_review`; this may open
or update that stage in the App. Submit the prepared payload in the same turn;
the submission result opens or updates the App with the populated stage for
review.
The first generated result fills an untouched stage. The generator may replace
its own latest draft while no App edit has occurred since that generation. An
App edit marks the draft as user-edited; later generated output is then a
revision-bound proposal. These tools and `approve_forecast_specification` adapt
to the same workspace commands; use the returned actions for edits, proposal
decisions, approval, and continuation.

Use one `get_forecast_stage_review` call when the target stage's current content
or bindings are not already available. This call can open or update that stage
in the App, so do not fetch a previously reviewed stage just to repeat an
approval or Continue action. Read the complete response once, including its
workspace snapshot and structured bindings. Do not submit again to retrieve
fields or refresh the App. If acknowledgement is uncertain, fetch only the
affected stage and retry only if the review shows that the submission was not
saved.

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
as acceptance of the current reviewed content when the referent is clear. Route
the action by the current stage and the user's intent:

- For an unapproved stage with an enabled next-stage action, normal acceptance
  means approve and advance. Use `approve_and_continue` directly; Question has
  one draft and needs no separate candidate-selection action. If the stage is
  already approved, use its enabled `continue` action when the user wants to
  proceed.
- Use `approve` only when the user explicitly asks to approve and stay at the
  current stage. Do not advance after that request.
- If `approve_and_continue` is unavailable but both approval and continuation
  are available, approve the exact reviewed content, then use the enabled
  `continue` action from the updated workspace. Do not fetch or reopen a stage
  just to find that action.
- If validation, a conflict, or an unresolved proposal disables progression,
  resolve that issue or ask for the material choice before continuing. A pending
  proposal still requires a clear choice of the draft or suggestion; never
  silently apply it.

When approval implies progression, do not end the turn at approval. Pass the
complete action object, including `stage`, revision bindings, and
`next_stage` when present. Follow the returned next-stage instruction in the
same turn without waiting for another message or button click. Use returned
`next_stage_bindings` without reopening that stage; otherwise fetch the target
stage only when its current bindings are unavailable. Content shown in the
loaded App counts as reviewed, so the user can accept it in chat without
repeating it. Optional News still requires explicit opt-in.

When generated output is a proposal against an App-edited draft, include a
`rationale` with the material changes and why they improve the draft. Keep it
specific to the forecast and source evidence; use short paragraphs or bullets.
The App presents this reasoning alongside a concrete field-by-field comparison.

If a command fails input validation, correct the missing or invalid fields from
the returned action before retrying, without fetching or reopening a different
stage. An MCP App-originated message that names the next stage and supplies its
specification ID, language, and approved revision is an executable workflow
handoff. Follow the named skill and start that stage in the same turn; do not
reply only that the stage is ready or ask the user to start it. Stop for user
input only when the stage skill requires a substantive decision or approval.

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
an additional Continue request. In chat, the user's acceptance of the exact
displayed selection also authorizes continuation. If there is no
proposal, report that no actionable improvement was found and keep the draft available.
Execute the available `continue` command when the user requests progression,
then follow its returned chat instruction. A Continue intent or successful message delivery does not
establish that generation has started or finished. If app messaging is
unavailable, present the equivalent chat request.

`approve_forecast_specification` approves without advancing. Use it only when
the user explicitly asks to approve and stay at the current stage; ordinary
acceptance and progression should use the workspace's enabled
`approve_and_continue` action.

Pass the returned `forecast_specification_id` to every approval call; it is
required even when continuing in the same chat. Carry the ID and immutable
`language_code` into subsequent workflow calls and any requested export call.
Final approvals return this metadata in structured tool output; use it only for
subsequent workflow calls and keep it out of user-facing content. A new language or selected
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

When referring to the product's MCP App in user-facing chat, call it
“Bleavit Foresight”. Do not call it “Foresight App” or “Bleavit Foresight
App”. “App” may be used as shorthand within workflow instructions and tool
descriptions.

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

The MCP App is the supported surface for complete workflow reviews, validation,
menus, and actions. Do not reconstruct or repeat its reviews, draft fields,
validation messages, or available actions in chat. Use App-rendered content for
stage acceptance; a client without MCP App support has no text review fallback.
If an App fails to open or render, ask the user to reopen or retry it rather than
reconstructing the review in chat. Keep chat guidance to material information
that is absent from the App and to interactions that have no App control.
Intermediate approval reviews after the question stage are not user-facing;
immediately invoke the next stage and present only its review in the App.
Translate generated labels and fixed UI text, while preserving data-bearing
content exactly, including questions, definitions, placeholders, variable
values, source identities, URLs, ranks, dates, and status codes.

For conditional units, keep the condition and unmet disposition with the unit
in the App review and in every export; they are part of the selected unit, not
an additional approval stage.

Decision interviews within a stage use numbered questions and lettered options
(`1.A`, `1.B`), never dotted numeric choices. Ask two or three substantive
options plus a separate free-form fallback and a recommendation. Stage-specific
interview logic and formats live in the relevant skill reference.

Present interviews that have no App control in chat. Use App controls when they
exist; keep chat-only choices in the conversation transcript and wait for the
user's plain-text selection. Do not use a host-native input dialog or
`request_user_input` for these choices; the dialog can disappear when the
response finishes.

## Completion and exports

After background approval, open the `news_timeline` workspace and let the user
choose whether to include optional news. Once that choice and any opted-in
timeline are approved, call `execute_completion_command` with `kind: reopen` to
load the App completion/export flow and current revision. The App presents the
available export formats and previews the selected document. News research
still requires explicit opt-in. Feedback remains available after prior
submissions; invite additional feedback when selected again.

For requested YAML, JSON, and/or Markdown, call `execute_completion_command` with
`kind: export`, the requested `formats`, and the reopened `expected_revision`.
Show the generated documents in the App completion/export flow; do not duplicate
the full export in a chat review. Exporting saves the displayed approved revision
as complete. The server excludes internal metadata and outdated approvals. Route
requested changes through the affected stage and its approvals, then generate
new exports.

If feedback was selected with exports, keep the documents in the App completion
flow and then show the feedback controls without a redundant yes-or-no prompt.
If feedback was selected alone, finish that flow and reopen completion. A
requested specification change goes through the affected stage and its
approvals before a new export is generated. When the user asks to start another
specification from completion in chat, create it as a new record in the
requested language, without carrying over its predecessor's ID or approvals.

### Optional product feedback

When the user selects feedback or accepts either direct invitation, call
`get_plugin_feedback_step` with `step: channels`. Present the result in the App
and wait for the channel choice; do not ask for feedback text yet. A direct request to draft the feedback email
counts as choosing the email channel. Never use a host-native input dialog for
the channel menu.

If the user chooses private submission, call `get_plugin_feedback_step` with
`step: private_notice`. Present it in the App and wait for the feedback text. If
the user supplied text before seeing the notice, ask
them to confirm that exact text after the notice before submitting it. The
App's private notice is the sole owner of the privacy disclosure; show it only
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
