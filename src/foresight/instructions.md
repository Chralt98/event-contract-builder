# Bleavit Foresight MCP server

Before analysis, research, or drafting, use the `preparation` bundle from an
approval handoff or stage review when supplied; otherwise call `prepare_stage`
for that stage. Read the complete bundle: it contains the canonical shared
runtime instructions, active skill, and required references. Tool descriptions
do not replace preparation.

## Runtime policy

The packaged skills own semantic drafting and research. This server owns
validation, rendering, workflow state, and approvals. Follow the active skill's
reference for stage-specific rules; do not reproduce those rules from this
file or from tool descriptions.

Do not reread the bundled files separately unless the skill calls for an
additional conditional reference.

Pass the returned `preparation_receipt` to stage submissions and generated
workspace commands (`submit_generated_draft` or `submit_proposal`). Reuse it
for edits and retries while its stage and instruction versions remain current.
When fetching a stage review or advancing, also pass the previous receipt: the
server reuses current preparation on review and delivers the next stage skill
in the existing handoff without repeating shared instructions already delivered.
A missing, expired, wrong-stage, or outdated receipt blocks generated submissions
before any save or App review; refresh preparation and reassess the draft.
Preparation is internal metadata, not user approval or proof of comprehension.

## Workflow state

The user may open and edit any stage at any time; the stage menu is navigational
and must not disable later stages because earlier stages are incomplete. Opening
an untouched stage saves an incomplete draft. The customary path is Question,
Terms, Sources, Criteria, Background, then optional News, but it is guidance
rather than a required navigation sequence. Approval and progression require
the current prerequisite approvals. The stage menu is for navigation and
review; stage approval and progression are initiated in chat after the user
accepts the displayed draft and the next step. Infer the user intent. Moving between
stages never approves or advances content, and the App does not show stage
approval or Continue buttons.

Submission tools validate and store a pending stage. All six stages use one
revision-bound MCP App workspace. `execute_workspace_command` is App-only and
runs commands selected in the workspace UI. Chat uses operation-specific tools:
`get_forecast_stage_review` for stage review, stage submission tools for generated
drafts and proposals, `save_forecast_stage_draft` for an incomplete or direct
draft edit, dedicated proposal actions for apply, accept, or discard, and the
revalidation, review-completion, news-choice, approval, and continuation tools
for their named actions. These tools return structured state without requiring
the App UI. Model-driven approval and continuation use the operation-specific
approval or continuation tool. The App uses commands returned in
`workspace.presentation.actions` as complete command objects, preserving their
target and revision bindings.
The App replaces only editable payloads, uses a fresh command ID for a new
operation, and preserves the same ID and payload when retrying a lost
acknowledgement. Model workflows must not call this App-only tool. If a
stage-specific submission tool is absent from the live tool catalog, use
`save_forecast_stage_draft` with the complete validated stage draft and current
preparation receipt and revision bindings. For a requested revision-bound
suggestion, use `propose_forecast_stage_changes`. These tools open or update
the App with the stage for review.

After stage preparation, for a new model-generated question call `submit_drafted_question` directly;
it creates the record and workspace. Do not call `create_question_workspace`
first. Use `create_question_workspace` only when the user wants an empty
workspace for manual entry. On an existing record, pass the revision fetched
before generation. The generator may replace its own latest draft while no
App edit has occurred since that generation. An App edit marks the draft as
user-edited; later generated output is then a revision-bound proposal.
Applying a proposal changes the draft without approving it. `submit_forecast_question_unit`
saves a pending question with the current workspace revision. The App presents
the proposed question and its ranges for review. Editing alone does not approve
content.

After submitting a valid generated stage, leave it open in the MCP App and ask
in chat whether the user approves that draft and wants to proceed to the named
next stage. Do not approve or progress automatically just because generation
finished, the App opened, or the user navigated between stages. Once the user
confirms, use the enabled approval-and-progression action and complete the
returned next-stage handoff in the same turn. After submitting that stage, ask
for its approval in chat before moving on. Ask the optional News choice in chat.

For stage submissions after Question, finish the analysis before submitting,
prepare the complete payload, and use the exact revision and prerequisite
bindings from the latest workspace response. When approval or an MCP App
handoff supplies `next_stage_bindings`, use them directly; do not fetch the
target stage again. Otherwise, fetch only that target stage with
`get_forecast_stage_review` when its bindings are unavailable. This tool
returns structured state without attaching or opening the MCP App UI. Submit
the prepared payload in the same turn; the submission result opens or updates
the App with the populated stage for review.
The first generated result fills an untouched stage. The generator may replace
its own latest draft while no App edit has occurred since that generation. An
App edit marks the draft as user-edited; later generated output is then a
revision-bound proposal. These tools and `approve_forecast_specification` adapt
to the same workspace commands; use the returned actions for edits, proposal
decisions, approval, and continuation.

Use one `get_forecast_stage_review` call when the target stage's current content
or bindings are not already available. It may initialize an untouched stage,
but does not attach or open the MCP App UI. Do not fetch a previously reviewed
stage just to repeat an approval or progression action. Read the complete response
once, including its workspace snapshot and structured bindings. Do not submit
again to retrieve fields or refresh the App. If acknowledgement is uncertain,
fetch only the affected stage and retry only if the review shows that the
submission was not saved.

For every approval, pass the exact `expected_revision` and
`prerequisite_revisions` from the reviewed result. Missing or stale bindings
require a fresh review (`get_forecast_stage_review` for a saved stage, or a
workspace `reopen`), reconciliation, and retry; never infer the bindings from
conversation memory. Preserve local edits on conflict. An incomplete draft may
be saved with validation issues, but approval requires valid selected content.
A valid manual edit to a stage that is already approved immediately updates
that stage's approved content and export; it does not need chat approval. A
model-generated draft, or a proposal copied into the draft without choosing
accept, remains pending explicit chat approval after manual edits. Accepting a
proposal in chat already approves it; do not ask for a second approval. Keep
other pending edits distinct from approved content; outdated dependent work
must be reviewed before finalization. The App marks outdated approvals with `↻` and
uses `!` only when a concrete proposal is available. Opening a stage never
starts a review automatically.

After a successful approval that changes approved content, including accepting
a proposal, inspect the tool result's `impact_review`. A pending review is a
signal to screen the other saved stages; it is not yet an offer to the user.
Compare the newly approved content with the approved content of every stage in
`review_stages` and `stages_with_existing_proposals`, reusing complete current
snapshots already available and otherwise fetching each stage once. For a stage
with a proposal, assess its approved snapshot; the proposal alone is not a
conflict. Check for concrete material
incompatibilities in event, scope, threshold, resolution sources, or method;
ignore style differences and do not treat an outdated marker alone as a
conflict. If no concrete incompatibility is found, do not offer an impact
review. If the comparison is blocked by local edits, a conflict, or an existing
proposal, do not infer a conflict; explain the limitation only when it prevents
answering the user's current request.

When a concrete incompatibility is found, name the affected stages and briefly
describe what no longer matches, then ask once whether the user wants an impact
review to prepare suggestions for the affected stages. Do not send a message as
the user or start the review before they agree. The review will not approve or
advance anything. If the result says the review is already accepted, continue
it without asking again. If there is no `impact_review`, do not screen or offer
one. A decline is recorded for that approval revision; check again only after a
later content-changing approval. If another approval arrives while the question
is unanswered, keep one question open and use the latest approval revision
when the user answers.

After the user agrees, call `decide_forecast_impact_review` with `review` and
use its returned latest revision and stage lists; this coalesces approvals that
arrived while the prompt was pending. Review every returned stage with saved
content, including stages before and after the approval that triggered the
review. If the latest App context packet reports
`local_edits_uncommitted: true` for a stage, skip and report that stage. Also
skip and report stages with an existing proposal or conflict.
Reuse a complete current snapshot already available for a stage. Otherwise,
fetch each eligible stage once; do not repeat a successful fetch or refetch
after a successful save. On a conflict, refetch only the affected stage.
If a proposal or pending decision in an earlier stage could invalidate later
suggestions, defer those later stages and revisit them after that decision.
For each stage, use its skill and current workspace bindings. Consider only
changes to meaning or resolution material: event, scope, threshold, sources, or
method. Ignore style-only edits. If an affected approved stage remains valid
and unchanged but is outdated, use `revalidate_unchanged`; otherwise submit a
complete revision-bound proposal and leave it unapproved. Never apply a
proposal, approve a stage, or advance as part of the impact review. Ask for a
fresh explicit News choice when its prerequisites changed; do not research News
until the user opts in. Report proposals, unchanged revalidations, and skipped
stages, then call `decide_forecast_impact_review` with `complete`.

Treat “approve”, “continue”, “I'm okay with it”, “looks good”, or similar assent
as acceptance of the current reviewed content when the referent is clear. Route
the action by the current stage and the user's intent. The chat must name the
draft and proposed next stage in its approval question; otherwise clarify
whether the user wants to approve, edit, or stay at the stage:

- When the user accepts the displayed draft and the chat's named next stage,
  use the enabled `approve_and_continue` action for an unapproved stage.
  Question has one draft, so the user approves that forecast question unit directly. If
  the stage is already approved, use its enabled `continue` action when the
  user confirms that next step.
- Use `approve` only when the user explicitly asks to approve and stay at the
  current stage. Do not advance after that request.
- If `approve_and_continue` is unavailable but both approval and continuation
  are available, approve the exact reviewed content, then use the enabled
  `continue` action from the updated workspace with
  `continue_forecast_specification`. Do not fetch or reopen a stage just to find
  that action.
- If validation, a conflict, or an unresolved proposal disables progression,
  resolve that issue or ask for the material choice before continuing. A pending
  proposal still requires a clear choice of the draft or suggestion; never
  silently apply it.

After the user confirms the chat approval question, pass the complete action
object, including `stage`, revision bindings, and `next_stage` when present, to
`approve_and_continue_forecast_specification`. Follow the returned next-stage instruction in
the same turn; do not wait for a button click. Use returned
`next_stage_bindings` without reopening either the completed stage or the target
stage. Do not call `get_forecast_stage_review` for content and bindings already
present in the loaded App or the handoff response; the call is unnecessary and
may initialize an untouched stage. Content shown in the loaded App counts as
reviewed, so the user can accept it in chat without repeating it. Optional News
still requires explicit opt-in.

When generated output is a proposal against an App-edited draft, include a
`rationale` with the material changes and why they improve the draft. Keep it
specific to the forecast and source evidence; use short paragraphs or bullets.
After the proposal is saved, explain its rationale in the text chat. The App
shows the concrete suggested values for review and copying, without the
rationale field.

If a command fails input validation, correct the missing or invalid fields from
the returned action before retrying, without fetching or reopening a different
stage. An MCP App-originated message that names the next stage and supplies its
specification ID, language, and approved revision is an executable workflow
handoff. Complete the named stage's analysis and submit its prepared content in
the same turn so the populated stage opens in the MCP App. A stage review fetch
only returns structured state; it does not display the stage. Do not stop after
fetching it, reply only that the stage is ready, or ask the user to start it.
After the populated stage opens, ask the user to approve it in chat before
progressing again. Stop for user input when the stage skill requires a
substantive decision or the user must approve the review.

After background approval, ask the user in chat whether to skip or research
optional news. Save the choice with `set_forecast_news_choice`, which keeps the
News App closed while research is underway. Save `opted_in` before researching
or generating news; submit the populated timeline to open it for review. Save
`declined` when the user skips news, and save `unavailable` after opted-in
research when nothing qualifies or nothing is selected. These choices preserve
a background-only record without approving an empty timeline. Renew the choice
against current prerequisites after upstream changes. Timeline removal follows
the News skill reference.

When a concrete proposal exists, keep the user in the decision flow. In the
MCP App, keep the normal draft editor above the read-only suggestion. The user
may copy individual suggested text values to the clipboard and paste them into
the editor; copying never changes the draft. In chat, explicit acceptance of
the exact proposal authorizes `accept_forecast_stage_proposal`, which applies
and approves that stage only. If the user wants to apply a suggestion without
approving it, use `apply_forecast_stage_proposal`; stage approval remains a
separate decision. Use `propose_forecast_stage_changes` for a new chat-authored
suggestion, and `save_forecast_stage_draft` when they ask to save an incomplete
or direct edit for review. If the user keeps or edits the current draft, use
`discard_forecast_stage_proposal` after their choice; do not treat applying or
discarding a proposal as approval of a different stage or as permission to
progress. Ask for stage approval and name the next stage in chat. If there is no proposal,
report that no actionable improvement was found and keep the draft available.
Use `approve_and_continue_forecast_specification` only after the user confirms the chat
approval question, then follow its returned stage handoff. A successful tool
call or message delivery does not establish that generation has started or
finished. If app messaging is unavailable, present the equivalent chat request.

`approve_forecast_specification` approves without advancing. Use it only when
the user explicitly asks to approve and stay at the current stage; ordinary
acceptance and progression should use the workspace's enabled
`approve_and_continue` action through `approve_and_continue_forecast_specification`.

Pass the returned `forecast_specification_id` to every approval call; it is
required even when continuing in the same chat. The latest Bleavit Foresight
MCP App model-context packet also carries the active ID and may be used when a
prior tool result is no longer in the conversation context. Check that packet
before claiming the ID is unavailable; never invent a placeholder ID. Carry
the ID and immutable `language_code` into subsequent workflow calls and any
requested export call. Final approvals return this metadata in structured tool
output; use it only for subsequent workflow calls and keep it out of
user-facing content. A new language or selected
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
stage review and ask for approval in chat; a client without MCP App support has
no text review fallback.
If an App fails to open or render, ask the user to reopen or retry it rather than
reconstructing the review in chat. Keep chat guidance to material information
that is absent from the App and to the approval and progression question. After
submitting generated content, do not quote or summarize the submitted draft in
chat; this includes background information. The App displays the complete draft,
so ask only whether the user approves it or wants changes, and wait for the
user's chat approval before invoking the next stage.

Before creating a separate new specification with `create_question_workspace`
or `submit_drafted_question` without an existing specification ID, call
`check_active_forecast_draft` to check whether an active draft exists; this
check returns only its presence and does not read saved archives. If one exists, call
`open_active_forecast_draft` and identify that draft in chat using its returned
question summary; include the new question too when one is known. Ask whether
the user wants to keep the active draft or delete it and replace it with the new
draft. Wait for an explicit choice before creating or deleting anything. If the
user chooses replacement, call `delete_forecast_draft` with the ID returned by
the open tool, then create the new specification only after deletion succeeds.
Leave saved archives unchanged. If the user wants to keep the active draft,
leave it unchanged and do not create the separate draft.
Translate generated labels and fixed UI text, while preserving data-bearing
content exactly, including questions, definitions, placeholders, variable
values, source identities, URLs, ranks, dates, and status codes.

For conditional units, keep the condition and unmet disposition with the unit
in the App review and in every export; they are part of the forecast question unit, not
an additional approval stage.

For decisions without an App control, use `request_user_input_async` to present
all material questions whose prerequisites are settled. The interface presents
the questions sequentially; give each two or three mutually exclusive choices,
put the recommended choice first, and briefly say why. The interface provides a
free-form response. After the user answers, recompute the settled frontier and
ask another round if material decisions remain; there is no fixed question or
round limit. Use App controls when they exist. Do not use the Plan-mode-only
`request_user_input` dialog for these choices.

## Completion and exports

Once the optional news choice and any opted-in timeline are approved, call
`open_forecast_export` to open Export in the same
turn. Handoff and news-choice tools do not open the App. Tell the user Export
is ready only after that call succeeds, and let them choose an output format
there; do not ask whether to open it. For a format requested in chat, reopen
the completion/export flow to load its current revision, then export the
requested format.
The App reloads the selected preview after saving stage edits. A draft preview
includes valid manual edits and previously approved sections, even when dependent
stages are outdated. Unapproved model drafts and suggestions remain excluded.
An available preview does not finalize outdated or pending work; `ready` and
`complete` remain false until the current stage approvals and news choice are ready.
News research still requires explicit opt-in. Feedback remains available after
prior submissions; invite additional feedback when selected again.

For requested YAML, JSON, and/or Markdown, call `export_forecast_specification` with
the requested `formats` and the reopened `expected_revision`.
Show the generated documents in the App completion/export flow; do not duplicate
the full export in a chat review. Exporting saves the displayed approved revision
as complete only when its current approvals are ready. The server excludes internal metadata. Route
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
after the user chooses the private channel and provides the text. The App shows
the returned feedback reference and explains its 180-day retention and earlier
deletion. Confirm submission in chat without repeating the reference; tell the
user it is available in the App if they want to request deletion. Call
`delete_plugin_feedback` only after an explicit request and when the user
provides the feedback reference.

For email, use `support@bleavit.com` as the recipient without asking the user
for an address. In the first email-draft response, return only one native email
writing block, without a code fence or commentary. Draft a concise subject from
the user's feedback. Set the `recipient` metadata to `support@bleavit.com` so it
populates the Recipients field; never put a `To:` line or recipient address in
the body. Put the subject in metadata too. Replace `unique-id`, `Concise subject`, and
`Email body` with a unique ID, the generated subject, and a concise email body
containing the feedback. Use this exact structure:

```text
:::writing{id="unique-id" variant="email" recipient="support@bleavit.com" subject="Concise subject"}
Email body
:::
```

Do not add extra commentary, a separate `mailto:` link, forecast content, or
identifiers. Do not claim that an email was sent. For GitHub, explain that an
issue is public and may be copied or indexed; link to the issue form without
prefilling the user's feedback. Do not submit an email or GitHub issue on the
user's behalf.

## Validation errors

A rejected submission or command leaves that operation unapplied. Workspace
drafts can still be saved with field validation issues; those issues block
approval, not autosave. Correct only the reported field, preserve the rest of the payload, and retry. When criteria validation
fails, show only the corrected field and value and say that the existing
Forecast Specification was unchanged; do not repeat unchanged criteria.
