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

## Decision interview

Before drafting criteria, map only material user-dependent decisions as a
dependency tree. Resolve factual prerequisites yourself. Ask one decision from
the settled frontier per App screen and recompute the frontier after each
answer. Do not expose a downstream question while one of its prerequisites is
unanswered.

Track the question number and the exact or estimated number of questions
expected after the current question. Update the estimate when answers change
the dependency branches. Each decision is a separate question with exactly
three substantive lettered choices (A, B, and C), a recommendation with its
reason, and a free-form fallback. Do not pad choices, collapse decisions, or
treat agreement with unshown choices as an answer.

Continuing from Sources starts the interview automatically. Opening Criteria
directly shows its editable criteria field and a **Start interview**
action; starting that action opens the interview and prepares a draft. For
existing criteria, the user can choose **Refresh interview**. Publish each
single-question screen with `execute_workspace_command` using this complete
revision-bound command shape (take current revision bindings from the latest
workspace response):

```ts
{
  contract_version: 1,
  command_id: crypto.randomUUID(),
  forecast_specification_id,
  kind: "set_criteria_interview_round",
  stage: "resolution_criteria",
  expected_revision,
  prerequisite_revisions,
  round: {
    question_number: 1,
    questions_remaining: { kind: "exact", count: 0 },
    question: {
      decision_id: "stable-decision-key",
      title: "Short decision title",
      question: "One material user decision?",
      options: [
        { letter: "A", label: "Option A", consequence: "Effect of A." },
        { letter: "B", label: "Option B", consequence: "Effect of B." },
        { letter: "C", label: "Option C", consequence: "Effect of C." },
      ],
      recommendation: { letter: "A", reason: "Why A is recommended." },
    },
  },
}
```

Use `questions_remaining.kind: "estimate"` when the remaining count is not
known exactly. The App presents the choices, recommendation, and custom-answer
field. If the decision frontier is empty, skip the interview round and submit
the complete criteria immediately.
The App sends the user's answer through normal host messaging with a reference
to the question. Treat it as the answer to that question; do not ask it again
in chat. Recompute the frontier and publish the next single-question screen.
If no decisions remain, construct and submit the criteria immediately. Do not
reproduce the interview questions, approved specification, or an interview
transcript in chat. If the host cannot display the App, the criteria interview
is unsupported; do not fall back to chat questions.

After each answer, if the frontier is empty, immediately construct and submit
the criteria in that same turn; do not end with a status message or another
pre-submission response.

## Criteria

Write one complete user-facing Resolution Criteria text in the single editable
field. It must cover the outcome rules, approved resolution sources, resolution
method, and relevant exceptions or unresolved outcomes. Before submission,
check that complete text against [criteria-validation.md](criteria-validation.md).
The editor's Suggest action uses model judgment; do not use regular expressions
or fixed-phrase checks for semantic requirements.

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

Treat the display question as a short public summary. Make the criteria precise
against the approved sources while preserving the intended event and outcome;
source methodology, evidence cutoffs and exception handling need not all appear
in the question. Do not demand a wording change merely because the criteria are
more detailed. Resolve a material change to the user's intended outcome in the
decision interview rather than silently introducing it.

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

After all interview decisions are settled, call
`submit_resolution_criteria` once; the rendered submission is the only
criteria review before approval. Do not show a separate draft. Render the
question once, followed by its single complete outcome rule. The selected unit already
displays its placeholders and allowed values; do not duplicate them as
per-value criteria. Do not append a second No complement or repeat the original
unit question inside the criteria.

After explicit approval, approve `resolution_criteria`, then compare the display
question with the approved criteria. Ask whether to adapt the display question
only if a reasonable reader would infer a materially different event, subject,
threshold, outcome or time frame. If they substantially agree, continue without
an extra confirmation; the user can review the complete specification at the
end. Technical precision or omitted resolution details alone are not a mismatch.
For a material mismatch, explain the difference and offer a concise revised
display question. Do not alter approved content automatically; use the server's
revision and approval routing if the user requests the change. Otherwise continue
to background information; do not present the complete specification yet. If a
validation error occurs, correct only the reported field and retry the full
unchanged remainder. Show only the corrected field and value, explaining that
the failed submission changed nothing.
