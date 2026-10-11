# Resolution-criteria specification

Convert one exact unit, its approved definitions, and its approved source
hierarchy into deterministic Yes/No rules for its question.

Write one complete user-facing Resolution Criteria text. Include the outcome
rule, approved resolution sources and their priority, the method for looking up
and applying source evidence, and relevant exceptions or unresolved outcomes.
For a conditional unit, include its exact approved condition and selected
`ifUnmet` disposition, using approved condition sources and relevant exception
handling. For `resolve-50-50`, state that each binary outcome receives an equal
50% share. Make a custom action operational by specifying any required cutoff,
reference value, and source. An unresolved condition must follow its stated
unresolved treatment, not be assumed unmet.

## Chat interview

On first entry from approved Sources, ask material user-dependent decisions in
chat before opening the Criteria workspace. Use the `grill-me` skill's design
tree and rounds: resolve factual prerequisites yourself, ask every decision in
the settled frontier in one round, and defer dependent questions until their
prerequisites are answered. Number each question and give a recommended answer
with its reason. Word each question so “yes” accepts the recommendation. Wait
for the user's answers before recomputing the frontier and asking the next
round. Continue until no material decision remains; do not open or fetch the
Criteria workspace during these rounds.

When the interview is complete, construct and validate the criteria, then call
`submit_resolution_criteria` once. Its response opens the Criteria workspace
with one editable text field for review. Do not show a separate draft before
submission. After the first approval, use the existing criteria field on later
visits. If the user asks in chat to repeat the interview or revise existing
criteria, fetch the latest saved criteria and revision first. Treat the saved
text as the starting point: ask whether it captures the user's intent, identify
needed clarifications, and invite additional information. Use the same decision
tree and rounds when material choices remain. After the interview is complete,
submit the complete revised criteria as a revision-bound proposal without
overwriting or approving the saved draft. Do not start this workflow from an
App suggestion action.

## Criteria

Write one complete user-facing Resolution Criteria text in the single editable
field. It must cover the outcome rules, approved resolution sources, resolution
method, and relevant exceptions or unresolved outcomes. Before submission,
check that complete text against [criteria-validation.md](criteria-validation.md).
Review criteria by meaning; do not use regular expressions or fixed-phrase
checks for semantic requirements.

Audit the complete criteria, including evidence and exception rules, for
outcome-bearing terms introduced beyond the selected unit. Define any term
whose ambiguity could change the resolution in the criteria itself, using an
observable, source-grounded meaning. If materially different defensible
meanings require the user's choice, resolve it in the chat interview
before submission.

Make the criteria as determinate as possible: state observable conditions and
controlling evidence so different resolvers can apply them consistently with
little room for judgment or after-the-fact disputes.

Make the criteria actionable for a resolver: specify what to check and how to
apply the outcome condition, evidence hierarchy, and relevant exceptions. State
steps in order when sequence affects the result; use examples when they clarify
application. For source-derived values, specify settings that can materially
change the result, such as query terms, geographic scope, date window, or
aggregation.

Treat the display question as a short public summary. Make the criteria precise
against the approved sources while preserving the intended event and outcome;
source methodology, evidence cutoffs and exception handling need not all appear
in the question. Do not demand a wording change merely because the criteria are
more detailed. Resolve a material change to the user's intended outcome in the
chat interview rather than silently introducing it.

Before submission, test the rule against plausible edge cases and borderline
scenarios where a condition or evidence path may not apply cleanly. Clarify the
outcome for material cases; omit speculative cases that cannot affect
resolution. Also identify assumptions the rule depends on, such as an event
occurring, a report being issued, or a data series remaining comparable, and
specify how plausible failures affect resolution, including any fallback or
unresolved treatment.

Create one criteria object whose `question` exactly matches the selected unit
question, including its placeholders, and whose `criteria` contains the
complete open-text rule and all required content areas. Do not create separate
criteria for each placeholder value or range. Use the selected unit's declared
values as the complete set of possible substitutions, and state one rule that
applies uniformly to every allowed value and meaningful combination. Refer to
placeholders by their declared names where needed. If a single complete rule
cannot cover the selected unit uniformly, report that the unit needs revision
instead of expanding the criteria by value.

The No complement should say that the outcome resolves No otherwise (or an
equivalent concise phrase). Do not enumerate additional negative conditions;
explain material exceptions and unresolved outcomes within the same complete
criteria text.

Use plain language for an informed non-specialist, avoiding jargon and
preferring words to symbols when precision is unchanged. Use LaTeX math
delimiters for equations when they improve precision: inline `\( ... \)` or
display `\[ ... \]`. Define variables and units in ordinary text as well.

Name only the previously approved public sources that control the outcome and
state their priority. Explain how to locate and evaluate the evidence in those
sources and apply the outcome rule. Address corrections, revisions, conflicts,
fallback, non-publication, or methodology changes only when relevant. For
estimates that may be revised,
name the controlling release (such as preliminary or final) or the date from
which the latest available value counts. For finite numeric or date ranges,
state what happens if the value falls outside all listed outcomes. When a
methodology change affects an estimate, specify the controlling method, how
material changes are handled, and what comparable fallback or unresolved
treatment applies. After relevant sources and fallbacks are exhausted,
distinguish insufficient or conflicting evidence from evidence that the Yes
condition failed. Distinguish
**Ambiguous** cases, where available evidence cannot establish the outcome,
from **Annulled** cases, where reality is clear but the question or criteria
cannot fairly map it to an outcome. State the disposition for each; do not
assume platform-specific scoring or refund behavior, and never treat missing
proof as No. Address only material boundaries, ties, multiple or absent
matches, postponement, cancellation, invalidated assumptions, underspecified
criteria, or unresolved outcomes. Apply the evidence, source,
and exception rules consistently to every allowed value.

## Submission and recovery

After all chat interview decisions are settled, call
`submit_resolution_criteria` once; the rendered submission is the only
criteria review before approval. Do not show a separate draft. Render the
question once, followed by its single complete outcome rule. The selected unit
already displays its placeholders and allowed values; do not duplicate them as
per-value criteria. Do not append a second No complement or repeat the original
unit question inside the criteria.

For the initial criteria review, ask whether the user approves the criteria
and wants to continue to Background, or wants changes. On assent, follow the
server-wide [approval routing](../../../src/foresight/instructions.md#workflow-state)
to approve and continue, then follow the returned handoff to draft Background
in the same turn. Approve and stay only when the user explicitly asks to stay
at Criteria. After approval, compare the display question with the approved
criteria. A reasonable reader
must not infer a materially different event, subject, threshold, outcome, or
time frame; technical precision or omitted resolution details alone are not a
mismatch. If the question and criteria substantially agree, do not propose a
question change. For a material mismatch, prepare a concise revised display
question as a revision-bound proposal for the Question stage, using current
workspace bindings. Do not change or approve the question automatically. Tell
the user to review the Question stage's `!` marker and follow the server-wide
proposal review and progression rules. If no proposal is needed, follow the
user's chat-confirmed progression to Background; do not present the complete
specification yet. If a validation error occurs, correct only the reported
field and retry the full unchanged remainder. Show only the corrected field
and value, explaining that the failed submission changed nothing.
