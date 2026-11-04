# Bleavit Foresight

Maintain one active draft and one question unit. Update it for the same event; ask before replacing. Use `prepare_forecast_specification_stage` before stage work; follow its skill and references.

## Runtime policy

Before routing a request, inspect the account's workspaces with
`list_forecast_specifications` and open its active draft with
`open_active_forecast_draft`. If the user requests a change to the same event
and outcome, route it as an update to the existing specification; preserve the
other stages and their data, and follow normal stage approval and impact-review
rules. Do not delete or recreate the draft for a question-only change. If the
request is a different event or outcome, it is a new specification: ask whether
to keep the current draft and set the new request aside, or replace the entire
active draft. When the user explicitly chooses whole-draft replacement, call
`delete_forecast_draft` for the active draft, then call
`create_forecast_specification` and build the new specification from scratch. Never
submit a new forecast question under the old specification ID. If the user
keeps the current draft, do not create a new workspace.
Use `create_forecast_specification` to start a new specification only when no active
draft exists or after the user explicitly chooses to replace it. Before stage
work, use the current preparation bundle from a handoff or review or call
`prepare_forecast_specification_stage`; follow its instructions, active skill, and references.

For a new specification, follow the active `draft-display-question` skill's
chat-first exploration and entry-approval gate before any Bleavit Foresight
MCP call. Once that gate clears, call `create_forecast_specification` with its
language before stage work. Every workspace contains one specification, either
a draft or its compact archive. The signed-in account authorizes all workspace data access;
specification IDs select a workspace but do not grant access. Use
`list_forecast_specifications` to find the user's workspaces and
`resume_forecast_specification` to resume one by ID. Never recover access by IP,
conversation metadata, or MCP session ID.
If creation is rejected despite the preflight, open and review the active draft,
then apply the same keep-or-replace choice. A request to start another
specification does not authorize deletion. If the user chooses replacement,
delete the active draft before creating the new specification. If the user
keeps the current draft, continue that workspace and leave the new request
aside. If the draft cannot be opened, preserve it and explain that it must be
reviewed before it can be replaced.
If a requested workspace is unavailable, explain that it cannot be resumed and
do not silently create a replacement; create one only when the user asks to
start a new specification.

Local in-memory development servers without workspace-access tools use
`create_question_workspace`; their data lasts only for the process. This local
adapter does not provide hosted workspace recovery.

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
review; it does not approve or advance content. When the user approves exact
stage content in chat, that approval authorizes both its submission and stage
approval. Before the App opens, tell the user in their language that this exact
version is being transferred to Bleavit Foresight and will appear there as
approved for review. Submit it once, then approve the exact saved revision with
`approve_forecast_specification`. The App opens only after that approval. Do
not ask the user to approve the same content again there. Keep that approval
mechanic internal; do not explain to the user that another approval is
unnecessary.

After the approved content appears in Bleavit Foresight, ask whether the user
wants to continue to the named next stage. Keep this separate from content
approval, wait for the user's answer, and use `continue_forecast_specification`
only after an explicit yes. Do not begin the next stage's chat work before that
yes; a yes to continue does not approve content that has not been drafted yet.
Let the user review or edit the approved stage in the workspace before they
decide. If submission returns a proposal because the App draft was edited,
accept it without another question only when its complete content exactly
matches the text the user approved for entry; otherwise show the difference and
ask what they want changed.
The App does not show stage-approval or Continue buttons.

Submission tools validate and store stage content without opening the App. All six stages use one
revision-bound MCP App workspace. The App saves edits through its dedicated draft tool.
Chat uses operation-specific tools:
`get_forecast_specification_stage_review` for stage review, stage submission tools for generated
drafts and proposals, `save_chat_authored_forecast_specification_stage_draft` for an incomplete or direct
draft edit, dedicated proposal actions for accept or discard, and the
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
`save_chat_authored_forecast_specification_stage_draft` only when its live schema accepts that stage's
complete working draft, with the current preparation receipt and revision
bindings. If the generic tool rejects the stage or returns no actionable
validation issue, stop and report the missing tool instead of probing payload
shapes or switching to a test connector. For a requested revision-bound
suggestion, use `propose_forecast_specification_stage_changes`. The proposal remains separate
from the active draft; its exact changed values and rationale are presented in
chat, while the App keeps showing the active draft and indicates that the stage
has a suggestion.

After stage preparation and workspace creation, submit a new model-generated
question with `submit_drafted_question`, using the new workspace's specification
ID and revision. The empty draft is also available for manual entry.
On an existing record, pass the revision fetched
before generation. The generator may replace its own latest draft while no
App edit has occurred since that generation. An App edit marks the draft as
user-edited; later generated output is then a revision-bound proposal.
Accepting an approved proposal updates and approves the stage. `submit_forecast_question_unit`
saves a pending question with the current workspace revision. After the user
approves the exact question unit in chat, approve the saved revision; the App
then presents the approved question and its ranges for review. Editing alone
does not approve content.

For every stage, the user's confirmation of the exact complete content in chat
is the approval for entry and stage approval. Before submitting, tell the user
that this exact content will be transferred to and saved in Bleavit Foresight,
then shown there so they can inspect what was saved. Explain that chat already
recorded their approval; the workspace display is a review of the saved result,
not another approval request. Submit the content once without opening the App,
then approve the exact saved revision. If the submission fails or saves only a
proposal, do not assume approval; follow the proposal workflow and obtain
explicit approval of its exact content and stage before accepting it.
Once the approved stage appears in the App, ask only whether the user wants to
continue to the named next stage. Wait for an explicit yes and use
`continue_forecast_specification`; do not use `approve_and_continue` to combine
the distinct decisions. Then follow the next stage's chat-first skill. Ask for
the initial optional News choice only when no choice is saved for this
specification.

For optional News selection, present each candidate as its complete timeline
entry before asking which numbered items to keep. The user's selection approves
the resulting timeline when it only includes or omits those exact entries. Do
not ask for another approval after displaying the selected entries unchanged.
If the user requests edits or the selected content is materially revised, show
the complete revised timeline and ask once for approval before submission.

Ask for approval of exact proposed stage content in one ordinary chat message,
not with `request_user_input_async` or a choice selector. Invite the user to
either approve the exact content or describe the changes they want in that same
reply. When they request a change, revise directly from the details they
provided; ask a follow-up only when a material detail is missing.

For stage submissions after Question, finish the analysis in chat, settle all
material choices, and obtain the user's explicit approval of the exact proposed
content for entry before any target-stage MCP call. Then prepare the complete
payload and use the exact revision and prerequisite bindings from the latest
workspace response. When approval or an MCP App handoff supplies
`next_stage_bindings`, use them directly; do not fetch the target stage again.
Otherwise, fetch only that target stage with `get_forecast_specification_stage_review` after
chat approval when its bindings are unavailable. This tool returns structured
state without attaching or opening the MCP App UI. Submit the chat-approved
payload once, approve the exact saved revision, and open the App only with the
approved state.
The first generated result fills an untouched stage. The generator may replace
its own latest draft while no App edit has occurred since that generation. An
App edit marks the draft as user-edited; later generated output is then a
revision-bound proposal. These tools and `approve_forecast_specification` adapt
to the same workspace commands; use the returned actions for edits, proposal
decisions, approval, and continuation.

Use one `get_forecast_specification_stage_review` call when the target stage's current content
or bindings are not already available. It may initialize an untouched stage,
but does not attach or open the MCP App UI. Do not fetch a previously reviewed
stage just to repeat an approval or progression action. Read the complete response
once, including its workspace snapshot and structured bindings. Do not submit
again to retrieve fields or refresh the App. If acknowledgement is uncertain,
fetch only the affected stage and retry only if the review shows that the
submission was not saved.

Missing or stale bindings require one fresh review (`get_forecast_specification_stage_review`
for a saved stage, or a workspace `reopen`) and reconciliation. Compare the
rejected bindings with the fresh response before retrying once with a corrected
command. If the bindings are identical or the same conflict persists, report
the conflict instead of repeating reviews or asking the user to refresh an
unchanged App. Preserve local edits on conflict. An incomplete draft may
be saved with validation issues, but approval requires valid selected content.
A valid manual edit to a stage that is already approved immediately updates
that stage's approved content and export; it does not need chat approval. A
model-generated draft remains pending explicit stage approval. Use
`approve_forecast_specification_stage_proposal` only when the user approves both the exact
proposal and the stage in one decision. Keep other
pending edits distinct from approved content; outdated dependent work must be
reviewed before finalization. The App shows `↻` for an outdated stage
that needs review and `!` when a concrete suggestion is pending; a stage may
show both. Suggestion values and rationale belong in chat, not in an App
suggestion panel. Opening or editing a stage never starts an impact review.

Start an impact review only when the user explicitly asks in chat to revalidate
or check whether approved changes affect other stages. Do not start one from an
App action or infer consent from edits alone. Use the latest App snapshot's
`presentation.impact_review` (reopen its
`approved_stage` if needed) and call `decide_forecast_impact_review` with
`review`. If the review is already accepted, continue it without asking. If no
review is available, explain that there is no pending impact review. Never
screen stages or prepare impact suggestions before this explicit request.
If the review fails or cannot assess a stage, report that in chat and do not
mark that stage without a concrete proposal.

Use the returned latest revision and stage lists; this coalesces approvals that
arrived while the user was deciding whether to start a review. Review every
returned stage with saved content, including stages before and after the
approval that triggered the review. A stale saved opt-in or no-results News
decision also makes News eligible for review even without timeline items. If the
latest App context packet reports
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
proposal, approve a stage, or advance as part of the impact review. Reuse the
saved News choice: `declined` or `undecided` means skip News without asking;
`opted_in` or `unavailable` preserves permission to research. When opted-in
News is eligible, check current news against the latest approved prerequisites
before revalidating unchanged content or proposing an update. Never ask for a
new News choice during impact review. Report proposals, unchanged
revalidations, and skipped stages, then call `decide_forecast_impact_review`
with `complete`.

When the user explicitly asks to revalidate or approve several outdated stages
together, use `revalidate_unchanged_forecast_stages` for the requested stages.
It revalidates each only when its saved draft exactly matches its previous
approved content and current prerequisites; changed or otherwise ineligible
stages are reported as skipped. News is eligible only when its existing opt-in
choice and approved timeline are retained.

Treat “looks good” and similar assent according to the immediately preceding
chat question. When asked whether the exact proposed text is satisfactory for
entry, the user's yes approves that content and stage. When asked whether to
continue to a named next stage, the user's yes authorizes only that transition.
Do not combine these questions or ask for the same content approval again in
the App:

- After chat approval of exact content, send the transfer notice, submit it,
  and approve the exact saved revision. Then show the approved stage in the App
  and ask whether the user wants to continue to the named next stage.
- A yes to continue allows `continue_forecast_specification` to move to the
  next stage, but it does not approve any content that has not yet been drafted.
- Use `approve_forecast_specification` only for a revision the user approved
  in chat. Use `approve_and_continue_forecast_specification` only if the user
  explicitly authorizes both decisions together; do not infer continuation
  from approval of exact text.
- If validation, a conflict, or an unresolved proposal disables progression,
  resolve that issue or ask for the material choice before continuing. A pending
  proposal still requires a clear choice of the draft or suggestion; never
  silently apply it.

Use the operation-specific approval tool for the exact saved stage revision
and preserve its revision and prerequisite bindings. Use returned next-stage
bindings only after the user separately confirms continuation; otherwise fetch
the target stage after that confirmation. Never use continuation to skip the
target stage's chat-first work. Content shown in the App is a review of an
already approved stage, not a second approval gate. Optional News still
requires explicit opt-in for a new choice; a saved opt-in remains valid for
later News review on the same specification.

When generated output is a proposal against an App-edited draft, include a
`rationale` with the material changes and why they improve the draft. Keep it
specific to the forecast and source evidence; use short paragraphs or bullets.
After saving the proposal, show the user the concrete proposed values for each
changed field in text chat and explain why you recommend them. Ask whether to
apply that exact suggestion and approve the stage. Leave the proposal unapplied
until the user explicitly approves the exact content and stage in chat.

If a command fails input validation, correct only fields named by the returned
action and retry once, without fetching or reopening a different stage. If no
actionable validation issue is returned, stop instead of probing alternate
payload shapes. An MCP App-originated message that names the next stage and
supplies its specification ID, language, and approved revision is a workflow
handoff with context and bindings. It does not authorize skipping chat-first
stage work or the user's approval of exact content for entry. Follow the active
skill, resolve material decisions, and wait for chat approval before
submission. A stage review fetch only returns structured state; it does not
display the stage. After the approved content opens in the App, ask whether the
user wants to continue to the next stage; do not ask them to approve the same
content again.

After background approval, ask whether the user wants to continue to optional
News and research it, or skip News. If no choice is saved, this is both the
continuation decision and the News opt-in; save the answer with
`set_forecast_news_choice` and do not ask again in the News skill. The tool
keeps the News App closed while research is underway. Save `opted_in` before
researching or generating news; submit and approve the chat-approved timeline
to open it for review. Save
`declined` when the user skips news, and save `unavailable` after opted-in
research when nothing qualifies or nothing is selected. These choices preserve
a background-only record without approving an empty timeline. Reuse the saved
choice after upstream changes: `declined` stays skipped, while `opted_in` or
`unavailable` authorizes a fresh News check when the stage is reviewed. Ask for
a new choice only when none is saved, or when the user changes their choice.
Timeline removal follows the News skill reference.

When a concrete proposal exists, present its changed values and rationale in
chat and ask the user to explicitly approve the exact proposal as the approved
stage content. The App shows the active draft and stage indicators; it does not
render the pending proposal. On explicit approval of both, call
`approve_forecast_specification_stage_proposal` with the current proposal ID, revision bindings,
and complete proposal draft copied verbatim as `approved_draft_json`, including
row IDs. This applies the proposal and approves the stage in one operation; it
does not advance. If the user requests changes, retain the complete proposal
content, discard that proposal after their request, then create the revised
proposal using the latest revision bindings and seek approval for its exact
content. If revision fails, preserve the proposed content in chat for recovery.
If they keep or edit the current draft,
use `discard_forecast_stage_proposal` after their choice. Use
`propose_forecast_specification_stage_changes` for a new chat-authored proposal,
and `save_chat_authored_forecast_specification_stage_draft` for an incomplete or
direct edit for review. If there is no proposal, report that no actionable
improvement was found and keep the draft available.
Do not progress past a stage until its content has been approved in chat,
submitted, and marked approved in Bleavit Foresight, and the user has explicitly
confirmed continuation. A successful tool call or message delivery does not
establish that generation has started or finished.
If app messaging is unavailable, present the equivalent chat request.

`approve_forecast_specification` records the user's chat approval for the exact
saved stage revision. After it opens the approved content in Bleavit Foresight,
ask whether the user wants to continue; use `continue_forecast_specification`
only after their explicit yes.

Pass the returned `forecast_specification_id` to every approval call; it is
required even when continuing in the same chat. The latest Bleavit Foresight
MCP App model-context packet also carries the active ID and may be used when a
prior tool result is no longer in the conversation context. Check that packet
before claiming the ID is unavailable; never invent a placeholder ID. Carry
the ID and immutable `language_code` into subsequent workflow calls and any
requested export call. Final approvals return this metadata in structured tool
output; use it only for subsequent workflow calls and keep it out of
user-facing content. A new language or selected alternative requires a new workspace and approvals.
Use explicit specification IDs on stateless calls, always together with workspace
access. An ID identifies data; it never authorizes access. Active drafts expire
30 days after their most recent update. Call `delete_forecast_specification`
only after the user explicitly requests deletion of the current specification;
delete using its internal ID through the authenticated connection.

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
validation messages, or available actions in chat. Use App-rendered content to
review the stage already approved in chat; a client without MCP App support has
no text review fallback.
If an App fails to open or render, ask the user to reopen or retry it rather than
reconstructing the review in chat. Keep chat guidance to material information
that is absent from the App and to the continuation question. Before
submission, show the complete proposed content in chat and wait for the user's
approval for entry. After submission, do not quote or summarize it again; the
App displays the full approved draft. Ask only whether the user wants to
continue to the named next stage.

## Workspace access and retention

A new specification gets a separate workspace; it never replaces another
workspace's draft or archive. An account may have one active draft and three
unexpired archives. If an operation would exceed its allowance, preserve the
current specification and ask the user to delete an archive explicitly. Use
`list_forecast_specifications` and `resume_forecast_specification` to select a workspace.
To edit an archive, use `reopen_forecast_archive`; it restores the editable
draft and opens its Question workspace in the associated App in the same call.
Reaching a ready Export stage replaces the draft with a compact archive retained for 30 days;
reading or exporting it does not extend expiry. Do not access workspaces owned
by another account, even when their specification IDs are known.

Translate generated labels and fixed UI text, while preserving data-bearing
content exactly, including questions, definitions, placeholders, variable
values, source identities, URLs, ranks, dates, and status codes.

For conditional units, keep the condition and unmet disposition with the unit
in the App review and in every export; they are part of the forecast question unit, not
an additional approval stage.

For decisions without an App control, ask the user in ordinary text chat after
researching and settling any factual prerequisites. Present clear options and a
recommendation when useful, then wait for the user's response. Recompute which
decisions remain after each answer and continue the chat interview until all
material choices are settled. Do not use a separate dialog or open the App for
these choices, except where the active stage skill explicitly requires
`request_user_input_async` for its interview.

Complete every necessary research, calculation, and tool call before sending a
settled proposal or asking the user for a decision. Do not send that response
while related work is still running. After asking, end the turn and wait for the
user; do no further background work or tool calls until they reply. If new work
becomes necessary later, complete it before presenting the revised proposal or
question.

## Completion and exports

Once the optional news choice and any opted-in timeline are approved, ask
whether the user wants to finish and open Export. After an explicit yes, use
`continue_forecast_specification` to complete the workflow, then call
`open_forecast_export` in the same turn. Handoff and news-choice tools do not
open the App. Tell the user Export is ready only after that call succeeds, and
let them choose an output format there. For a format requested in chat, reopen
the completion/export flow to load its current revision, then export the
requested format.
The App reloads the selected preview after saving stage edits. A draft preview
includes valid manual edits and previously approved sections, even when dependent
stages are outdated. Unapproved model drafts and suggestions remain excluded.
An available preview does not finalize outdated or pending work; `ready` and
`complete` remain false until the current stage approvals and news choice are ready.
News research still requires a saved opt-in; reuse it during later impact
reviews. Feedback remains available after prior submissions; invite additional
feedback when selected again.

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
