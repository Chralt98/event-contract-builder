# Resolution-criteria specification

Convert one exact unit, its approved definitions, and its approved source
hierarchy into deterministic Yes/No rules for its question.

## Decision interview

Before drafting criteria, map only material user-dependent decisions as a
dependency tree. Resolve factual prerequisites yourself. In each round, ask the
entire current frontier: decisions whose prerequisites are settled. Never ask a
downstream question with an unanswered prerequisite.

Track the round number and an exact maximum when knowable, otherwise a
conservative estimate that is updated when branches change. For an estimate,
immediately suggest answering every question in the round, accepting or
rejecting each recommendation, supplying custom fallbacks, and stating logical
consequences in one response.

Each decision is a separate numbered question with two or three substantive
lettered choices, a recommendation, and an unnumbered free-form fallback. Do
not pad choices, collapse decisions, or treat agreement with unshown choices as
an answer. Use this localized structure:

```text
# Forecast Specification

## Stage: Resolution Criteria

**Selected Unit <unit_number>: <label>**
- <exact complete unit>

---

🧭 **Question round <current> of <total> (exact)**

❓ **1 · <short title>**
<one question>

**1.A** — **<option>** — <consequence>
**1.B** — **<option>** — <consequence>

➡️ **Recommendation:** Option 1.<letter> — <reason>
↪️ If none fits, state the result or behavior you want.

---
```

For an estimate, use “of about <estimate> (estimate)” and place the round-
reduction suggestion before question 1. Separate multiple questions with
`---`, and keep the final separator. Make the complete round the final
user-visible response for that turn, then wait. Record partial and free-form
answers, recompute the frontier, and continue until no decision remains.
After each answer, if the frontier is empty, immediately construct and submit
the criteria in that same turn; do not end with a status message or another
pre-submission response.

## Criteria

Start `resolvesYesWhen` with a complete future-tense sentence naming the Yes
condition and broad source; keep specific source links in
`evidenceAndSourceRules`.

Audit the complete criteria, including evidence and exception rules, for
outcome-bearing terms introduced beyond the selected unit. Define any term
whose ambiguity could change the resolution in the criteria itself, using an
observable, source-grounded meaning. If materially different defensible
meanings require the user's choice, resolve it in the decision interview
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

Cross-check the selected question against the resolution conditions: its event,
subject, scope, thresholds, outcomes, and time frame must match, without implying
a different trigger or resolution date. If they materially diverge, do not
submit criteria; report that the unit needs revision. Once the user selects a
revised unit, start it as a separate record and follow the shared approval
order, including new approvals for definitions and sources before drafting
criteria.

Before submission, test the rule against plausible edge cases and borderline
scenarios where a condition or evidence path may not apply cleanly. Clarify the
outcome for material cases; omit speculative cases that cannot affect
resolution. Also identify assumptions the rule depends on, such as an event
occurring, a report being issued, or a data series remaining comparable, and
specify how plausible failures affect resolution, including any fallback or
unresolved treatment.

Create one `questionRule` object whose `question` exactly matches the selected
unit question, including its placeholders. Give it one `resolvesYesWhen` and
one `resolvesNoWhen`; do not create separate questions or rules for categorical
outcomes, scalar ranges, or placeholder values. Use the selected unit's declared
values as the complete set of possible substitutions or outcomes, and state
one Yes/No rule that applies uniformly to every allowed value and meaningful
combination. Refer to placeholders by their declared names where needed. If a
single complete rule cannot cover the selected unit uniformly, report that the
unit needs revision instead of expanding the criteria by value.

`resolvesYesWhen` states every necessary and sufficient condition, including
the deadline, for all allowed values. `resolvesNoWhen` is only the concise
complement: No when the complete Yes condition is not met by the deadline. Do
not repeat negative versions of every Yes element or force a closed criterion
taxonomy.

Use plain language for an informed non-specialist, avoiding jargon and
preferring words to symbols when precision is unchanged. Use LaTeX math
delimiters for equations when they improve precision: inline `\( ... \)` or
display `\[ ... \]`. Define variables and units in ordinary text as well.

`evidenceAndSourceRules` identifies controlling public evidence and applies the
approved hierarchy. Address corrections, revisions, conflicts, fallback,
non-publication, or methodology changes only when relevant. For estimates that
may be revised, name the controlling release (such as preliminary or final) or
the date from which the latest available value counts. For finite numeric or
date ranges, state what happens if the value falls outside all listed outcomes.
When a methodology change affects an estimate, specify the controlling method,
how material changes are handled, and what comparable fallback or unresolved
treatment applies. After relevant sources and fallbacks are exhausted,
distinguish insufficient or conflicting evidence from evidence that the Yes
condition failed. In
`exceptionAndUnresolvedRules`, distinguish
**Ambiguous** cases, where available evidence cannot establish the outcome,
from **Annulled** cases, where reality is clear but the question or criteria
cannot fairly map it to an outcome. State the disposition for each; do not
assume platform-specific scoring or refund behavior, and never treat missing
proof as No. Use this field only for material boundaries, ties, multiple or
absent matches, postponement, cancellation, invalidated assumptions,
underspecified criteria, or unresolved outcomes. Apply the evidence, source,
and exception rules consistently to every allowed value.

## Submission and recovery

After all interview decisions are settled, call
`submit_resolution_criteria` once; the rendered submission is the only
criteria review before approval. Do not show a separate draft. Render the
question once, followed by its single Yes/No rule. The selected unit already
displays its placeholders and allowed values; do not duplicate them as
per-value criteria. Do not append the internal No complement or repeat the
original unit question inside the criteria.

After explicit approval, approve `resolution_criteria` and continue to
background information; do not present the complete specification yet. If a
validation error occurs, correct only the reported field and retry the full
unchanged remainder. Show only the corrected field and value, explaining that
the failed submission changed nothing.
