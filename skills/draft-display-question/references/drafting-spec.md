# Drafting specification

Use this reference for a new event or an existing draft.

## Chat-first exploration and source feasibility

Work out the user's intended forecast in chat before making any Bleavit
Foresight MCP call or opening the App. Ask only for details that materially
change the event, outcome, horizon, condition, condition cutoff, unmet
disposition, or finite values. Use `request_user_input_async` for each round
of unresolved material choices about those elements, including missing cutoff
dates or values and a conditional unit's unmet disposition. Recompute which
questions remain after each answer. Explore and refine the wording in chat; do
not create a workspace, prepare a stage, fetch a review, or submit a draft while
the user is still considering what to forecast.
For an update, include source feasibility in this exploration and get approval
for one concrete revised question unit before fetching the current question and
revision. If the fetched content materially changes the proposal, return to
chat and get approval again before submitting.

Before recommending a candidate, check whether a public, authoritative source
can resolve its exact outcome. Apply the authority, independence, coverage,
and locator rules in the [resolution-source specification](../../define-resolution-source/references/source-spec.md)
as a feasibility screen. Verify that a public source publishes or is expected
to publish the required fact, metric, scope, and cadence at the proposed
locator. If no public source fits, ask whether the user wants to use private
data they can authorize and identify. Treat it as a viable option only after
the user confirms the dataset or system exists, contains the needed fact for
the proposed subject and scope, and can be retrieved and verified consistently
at resolution time. Clarify its custodian, the user's authorized access, who
can verify the result, and any material coverage or access limits. Do not claim
to access or verify private data that the user has not provided through an
available authorized connection.
Show each candidate's source name, whether it is public or private in the chat,
and a direct link when available. Briefly state what the source can establish and any
material coverage or access limit. Identify an independent fallback when one
is available; a dependent mirror or republication can still help with technical
availability, but is not independent corroboration. A related source or an
assumed future publication is not enough: if the evidence does not support the
exact outcome, explain the gap and reshape the candidate. Treat this as
preliminary research for choosing a resolvable question, not as the final
source hierarchy for the later Sources stage.

When the request supports genuinely different, source-feasible framings, offer
several concise forecast question units in chat (usually two to four). Use
`request_user_input_async` to let the user choose among material options. Do not
invent alternatives to meet a count; explain when only one viable framing is
available. For each option, show the display question, its condition and unmet
disposition when applicable, and every variable with its proposed values.
Include the source evidence and key trade-off so the user can compare the
options. Ask which one they want, then refine that choice and recheck its source
coverage after any material change. Do not move the choice into the App.

Before submission, restate the single selected question unit in full, including
its condition, unmet disposition, and variables with values, plus the source
that supports its resolution. Show it as a text-chat proposal, iterate on
requested edits, and ask whether the user is satisfied after each revision.
Submit only after the user approves that exact complete unit for entry. If the
user has selected an option but has not made clear that they want it entered,
ask in chat before making any Bleavit Foresight MCP call.

## New-event draft

Write a short, conversational, attention-catching display question for the
user's intended future event. It is a simplified public summary, not the full
resolution rule. Preserve the intended subject, outcome and time frame without
packing source methodology, evidence rules or exceptions into the question;
those belong in the resolution criteria. Material supplied thresholds, units,
options and dates must not be contradicted or invented. Ask when the intent
itself is unclear; leave ambiguous terms for
[define-terms](../../define-terms/references/definition-spec.md) after the
forecast question unit is approved.
Use active voice and a question that makes sense on its own. Questions must be
10–200 characters and end with `?`.

The submitted question is one Yes/No forecast question unit. Keep the selected
intent intact. Do not treat a display question's lack of technical detail as a
defect; put the measurement rule and evidence standard in resolution criteria.

Every forecast question unit is a Yes/No forecast question. A finite variable
supplies values for a same-named angle-bracket placeholder in the question or
condition; every
substitution creates an individual Yes/No question. This also supports
categorical choices and numeric ranges: “Will <candidate> win?” asks a separate
Yes/No question for each candidate, and “Will the price be <range>?” asks one
for each range. Do not draft a multi-outcome “Which X?” question or list values
without using them in a placeholder.

When the user asks when an event will happen but leaves the horizon open, keep
the timing intent and parameterize the cutoff. For example, draft
“Will AGI arrive by <cutoff_date>?” with a `cutoff_date` variable; each supplied
date is its own Yes/No forecast. If the user has not supplied cutoff dates,
show the question template and use `request_user_input_async` to ask which
finite set of dates to include. Do not
reject the open horizon, turn it into “By what date?”, or invent dates. Submit
only after the variable has at least one user-supplied value and the user has
approved the complete question unit for entry.

When the user's outcome depends on a separate event, draft that event as the
forecast question unit's `condition` at this stage. State the prerequisite declaratively (for
example, `A law is enacted on or before June 30, 2027, 23:59 UTC`); it does not
need to be a question. State its cutoff explicitly and distinguish it from the
forecast's resolution deadline. If a unit intentionally allows multiple cutoff
dates, those dates can be represented by a `condition_date` placeholder. For
example, `A law is enacted on or before <condition_date>` could allow
`June 30, 2027, 23:59 UTC` and `September 30, 2027, 23:59 UTC`. If there is
only one cutoff, write that date directly in the condition. Every allowed
condition date must be on or before the forecast's resolution deadline; use
`request_user_input_async` if either date or their ordering is unclear. Avoid
saying only "the deadline"
without naming the condition cutoff. A conditional forecast question unit
must include its outcome question, observable condition, and the disposition
if the condition is established as unmet (`annulled`, `resolve-no`, `resolve-yes`,
`resolve-50-50`, or `custom`).
The pair must express the user's intended forecast together; do not fold a
prerequisite into ordinary outcome wording or silently choose its unmet
disposition. Use `request_user_input_async` to ask which disposition to use
when multiple treatments are materially different. A `custom` disposition must
state the action and any needed cutoff
or reference value. Do not treat lack of evidence that the condition held as
proof it was unmet. An unconditional forecast question unit is acceptable only
when it preserves the user's intent. Use `resolve-no`, `resolve-yes`, and
`resolve-50-50` for the individual Yes/No question, including when its
placeholder values describe categories or ranges. A multi-value variable does
not make an expanded question multi-outcome.

For every numeric question, specify the unit used (e.g., “Will Berlin’s average
temperature exceed 20 degrees Celsius in July 2027?”). When the user wants
forecasts for numeric or date ranges, use non-overlapping range values with
explicit boundary inclusion. Use open-ended bounds when plausible values could
otherwise fall outside every range. Each range is substituted into its own
Yes/No question.

Every angle-bracket placeholder must have a same-named variable. When a value
is used as a placeholder, place it in a grammatical slot that works with every
allowed value after substitution. Values must be complete phrases for that
slot, not labels that only make sense when the placeholder name is read; for
example, use “Will the price be <range>?” with values such as “below $80,000”
and “$200,000 or more”, not “Which <range> applies?”. Check every substitution
for grammar and faithful meaning. Every variable value is substituted into its
matching placeholder; it does not become an answer choice within one question.
For a conditional forecast question, check substitutions in both the outcome question and
condition statement.

## Variable invariance

Use variables for finite values that belong to one forecast question unit. Every variable must
parameterize wording through a same-named placeholder in the question or
condition. Every value and meaningful combination must retain the same
qualifying predicate, condition,
unmet disposition, interpretation, jurisdiction, legal/compliance treatment,
authoritative source hierarchy, source identity, formula, settlement procedure,
and methodology. If
any value needs a different rule, source, settlement method, or interpretation,
rather offer nearby forecast questions in chat. Never use a broad wildcard or add values merely to create a
variable. Approval preserves the complete forecast question unit and does not instantiate
one variable value.

## Output detail

The chat exploration presents and compares the candidate question units before
submission. The App workspace presents only the one selected question unit and
its ranges for review. Chat approval of the exact unit authorizes both
submission and stage approval; the App then opens with the approved unit. Ask
separately whether the user wants to continue to Define terms. Do not use App
review to choose among alternative forecast questions.
