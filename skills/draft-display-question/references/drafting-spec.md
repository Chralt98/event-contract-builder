# Drafting specification

Use this reference for a new event, a source-review alternative, or selection
of an existing draft.

## New-event draft

Write concise, conversational binary or categorical questions about a specific
future event within a defined time frame. Each question must be clear, definite,
and unambiguous: from the wording and its variables, a reader should identify
the subject or event, the qualifying outcome, the observation period, and what
fact makes each answer apply. Ask directly about the outcome; keep its rationale
outside the question. Each question should make sense without neighboring text
and remain clear if its position changes. Write display questions in active
voice (e.g.,
“Will Congress pass the bill?” rather than “Will the bill be passed?”); do not
invent an actor the context does not identify. State material thresholds,
units, jurisdictions, dates, and answer options explicitly. If supplied context
leaves materially different readings of the target, outcome, or time frame, ask
for clarification instead of guessing. Use `before [date]` for an exclusive
deadline and `on or before [date]` when the stated date counts; avoid `by [date]`.
If the target intent is clear but a term still has multiple defensible meanings,
leave that for [define-terms](../../define-terms/references/definition-spec.md)
after selection.
Preserve supplied events, thresholds, options, and dates; never
invent a missing one. Questions must be 10–200 characters and end with `?`.

Before presenting candidates, internally check whether a resolver could
determine each outcome from observable evidence. If not, replace abstract
candidates with narrower, measurable propositions or proxies that preserve the
user's intent. Do not show this check in the user-facing draft.

Produce at least three distinct selectable units: one direct interpretation
and at least two close reformulations, measurable proxies, or better-specified
interpretations that preserve the user's intent. A binary unit is one Yes/No
question. A categorical unit asks for an outcome and includes one finite
outcome variable whose values are the allowed answers; the values may be listed
without appearing as placeholders in the question. A binary question may also
use variables for finite parameters, with matching angle-bracket placeholders.
Values may be non-overlapping ranges on one numeric measure or mutually
exclusive categorical outcomes.

For every numeric question, specify the unit used (e.g., “Will Berlin’s average
temperature exceed 20 degrees Celsius in July 2027?”). For numeric or date-range
outcomes, use non-overlapping ranges with explicit boundary inclusion and set
bounds so the chance of falling outside all listed outcomes is roughly 5–10%. If
plausible values can fall beyond finite bounds, use open-ended ranges or specify
an outside-range outcome.

Every angle-bracket placeholder must have a same-named variable. When a value
is used as a placeholder, place it in a grammatical slot that works with every
allowed value after substitution. Values must be complete phrases for that
slot, not labels that only make sense when the placeholder name is read; for
example, use “Will the price be <range>?” with values such as “below $80,000”
and “$200,000 or more”, not “Which <range> applies?”. Check every substitution
for grammar and faithful meaning. For categorical units, values are outcome
labels and do not need to appear in the question text.

## Variable invariance

Use variables for finite values that belong to one unit. A variable may
parameterize wording through a same-named placeholder, or it may list the
categorical outcomes without a placeholder. A categorical unit uses one
unreferenced outcome variable with at least two allowed values. Every value and
meaningful combination must retain the same qualifying predicate,
interpretation, jurisdiction, legal/compliance treatment, authoritative source
hierarchy, source identity, formula, settlement procedure, and methodology. If
any value needs a different rule, source, settlement method, or interpretation,
split the unit. Never use a broad wildcard or add values merely to create a
variable. Selection preserves the complete unit and does not instantiate one
variable value.

## Source-review alternative

When source review reports missing primary coverage or no independent fallback,
propose one nearby, proxy, or better-specified unit that preserves the original
intent but can use at least two independent source agencies. Return only the
new display-question unit. Do not silently replace the original, define its
terms, or treat it as selected.

## Output detail

Keep units in drafting order. The follow-up asks which unit number to use or
revise and identifies term definition as the next stage. Use the same plain
1-based unit numbers shown in the rendered draft (`1`, `2`, `3`); do not
convert them to lettered choices. Never summarize or renumber the rendered
draft.
