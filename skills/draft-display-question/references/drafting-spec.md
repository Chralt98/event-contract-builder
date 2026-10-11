# Drafting specification

Use this reference for a new event or an existing draft.

## New-event draft

Write a short, conversational, attention-catching display question for the
user's intended future event. It is a simplified public summary, not the full
resolution rule. Preserve the intended subject, outcome and time frame without
packing source methodology, evidence rules or exceptions into the question;
those belong in the resolution criteria. Material supplied thresholds, units,
options and dates must not be contradicted or invented. Ask when the intent
itself is unclear; leave ambiguous terms for
[define-terms](../../define-terms/references/definition-spec.md) after selection.
Use active voice and a question that makes sense on its own. Questions must be
10–200 characters and end with `?`.

Submit one main draft question for App review. Keep the main intent intact.
Check source feasibility internally without treating a display question's
lack of technical detail as a defect. Offer
nearby forecast question ideas in chat when they add useful context.

Every draft is a Yes/No forecast question. A finite variable supplies values
for a same-named angle-bracket placeholder in the question or condition; every
substitution creates an individual Yes/No question. This also supports
categorical choices and numeric ranges: “Will <candidate> win?” asks a separate
Yes/No question for each candidate, and “Will the price be <range>?” asks one
for each range. Do not draft a multi-outcome “Which X?” question or list values
without using them in a placeholder.

When the user's outcome depends on a separate event, draft that event as the
unit's `condition` at this stage. State the prerequisite declaratively (for
example, `A law is enacted on or before June 30, 2027, 23:59 UTC`); it does not
need to be a question. State its cutoff explicitly and distinguish it from the
forecast's resolution deadline. If a unit intentionally allows multiple cutoff
dates, those dates can be represented by a `condition_date` placeholder. For
example, `A law is enacted on or before <condition_date>` could allow
`June 30, 2027, 23:59 UTC` and `September 30, 2027, 23:59 UTC`. If there is
only one cutoff, write that date directly in the condition. Every allowed
condition date must be on or before the forecast's resolution deadline; ask if
either date or their ordering is unclear. Avoid saying only "the deadline"
without naming the condition cutoff. Each candidate must show the outcome
question, the observable condition, and the disposition if the condition is
established as unmet (`annulled`, `resolve-no`, `resolve-yes`,
`resolve-50-50`, or `custom`).
The pair must express the user's intended forecast together; do not fold a
prerequisite into ordinary outcome wording or silently choose its unmet
disposition. A `custom` disposition must state the action and any needed cutoff
or reference value. Do not treat lack of evidence that the condition held as
proof it was unmet. An unconditional candidate is acceptable only when it
preserves the user's intent. Use `resolve-no`, `resolve-yes`, and
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

Use variables for finite values that belong to one forecast question. Every variable must
parameterize wording through a same-named placeholder in the question or
condition. Every value and meaningful combination must retain the same
qualifying predicate, condition,
unmet disposition, interpretation, jurisdiction, legal/compliance treatment,
authoritative source hierarchy, source identity, formula, settlement procedure,
and methodology. If
any value needs a different rule, source, settlement method, or interpretation,
rather offer nearby forecast questions in chat. Never use a broad wildcard or add values merely to create a
variable. Selection preserves the complete unit and does not instantiate one
variable value.

## Output detail

The App workspace presents the proposed question and ranges for review. In chat,
ask whether the proposal looks right and add only context the App does not show,
such as how the horizon or ranges were chosen. Nearby ideas may be mentioned in
chat when useful. Do not describe App review as a candidate-selection flow.
