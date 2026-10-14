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

On first entry from approved Sources, ask material user-dependent decisions
before opening the Criteria workspace. Resolve factual prerequisites yourself,
then use `request_user_input_async` to ask every decision in the settled
frontier. The interface presents questions sequentially. Put the recommended
choice first and give its reason; the interface supplies a free-form response
option. Defer dependent questions until their prerequisites are answered. After
the user's responses, recompute the frontier and ask another round if material
decisions remain. There is no fixed question or round limit. Continue until no
material decision remains; do not open or fetch the Criteria workspace during
these rounds.

When the interview is complete, construct and validate the criteria, then call
`submit_resolution_criteria` once. Its response opens the Criteria workspace
with one editable text field for review. Do not show a separate draft before
submission. After the first approval, use the existing criteria field on later
visits. If the user asks in chat to repeat the interview or revise existing
criteria, fetch the latest saved criteria and revision first. Treat the saved
text as the starting point: ask whether it captures the user's intent, identify
needed clarifications, and invite additional information. Use the same
iterative in-chat interview when material choices remain. After the interview is complete,
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

Use the same seven-part order for every draft, but write each part as an
ordinary prose paragraph without headings, labels, or label-like introductions
such as “Outcome:” or “Sources:”. The content and transitions should make each
paragraph's role clear. Keep the order below; do not add a second No rule at
the end:

1. **Outcome** — Start with the Yes rule, then the evidence-based No rule, then
   the disposition for evidence that cannot establish either outcome and for
   clear reality that the question cannot fairly map to an outcome. For
   conditional units, state the approved `ifUnmet` branch here and keep it
   distinct from an ordinary No result. The No rule must require evidence that
   the Yes condition was not met; missing proof alone is not No.
2. **Scope** — Define outcome-bearing terms and state what counts or does not
   count when a plausible boundary could change the result. Include this
   paragraph only when the question and approved definitions do not already
   settle a material boundary.
3. **Target and timing** — Follow the question's wording to identify what is
   being forecast. If it asks what a named source will publish, announce, or
   decide, that source action is the target. Otherwise, the target is the
   underlying event or value and approved sources are evidence for it. State
   the exact date and any material time and time zone; clarify whether a cutoff
   applies to the event, measurement period, or publication. If intent is
   ambiguous and could change the outcome, settle it in the chat interview.
4. **Sources** — List the exact approved primary source and every approved
   fallback in order, with each fallback's approved trigger. Never promote an
   evidence source into the event being forecast, or add a fallback, without
   approval.
5. **Method** — Give the resolver actionable steps for locating and applying
   the evidence, including material subject, measure, geography, query,
   aggregation, or cutoff settings.
6. **Data versions** — When relevant, identify which release or vintage
   controls and how to handle corrections or material methodology changes.
   Omit this paragraph when versioning cannot affect the outcome.
7. **Exceptions** — When relevant, resolve material cases such as a source
   failing to publish, conflicting evidence, a canceled or postponed event, or
   an invalidated assumption. State the specific disposition and fallback;
   omit speculative or immaterial cases.

The outcome, target and timing, sources, and method paragraphs are always
present, even when concise. Include scope, data versions, and exceptions only
when they add material information. The opening paragraph must state both Yes
and No before any procedural detail; later paragraphs may explain those rules
but must not introduce a conflicting result path. Use the approved output
language throughout.

For an event-targeted question, the approved sources provide evidence about the
event, and the source hierarchy remains controlling. Use a fallback only under
its approved trigger. Do not silently substitute a source or change the target
from the event to a source's publication, or vice versa.

Audit the complete criteria, including evidence and exception rules, for
outcome-bearing terms introduced beyond the forecast question unit. Define any term
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

Create one criteria object whose `criteria` contains the complete open-text
rule and all required content areas. Do not create separate
criteria for each placeholder value or range. Use the forecast question unit's declared
values as the complete set of possible substitutions, and state one rule that
applies uniformly to every allowed value and meaningful combination. Refer to
placeholders by their declared names where needed. If a single complete rule
cannot cover the forecast question unit uniformly, report that the unit needs revision
instead of expanding the criteria by value.

State No directly in the opening Outcome paragraph. It must describe evidence
that establishes the Yes condition was not met by the deadline. Do not make
missing or conflicting evidence a No outcome; state the applicable unresolved
disposition instead. Do not enumerate redundant negative conditions.

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
criteria review before approval. Do not show a separate draft. Present the
single complete outcome rule. The forecast question unit already displays its
placeholders and allowed values; do not duplicate them as per-value criteria.
Do not append a second No rule or repeat the original unit question inside the
criteria.

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
