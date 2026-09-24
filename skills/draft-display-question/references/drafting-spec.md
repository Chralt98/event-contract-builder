# Drafting specification

Use this reference for a new event, a source-review alternative, or selection
of an existing draft.

## New-event draft

Write concise, conversational Yes/No questions about a specific future event
within a defined time frame. Preserve supplied events, thresholds, options, and
dates; never invent a missing one. Questions must be 10–200 characters and end
with `?`. If the event, outcome, or time frame is materially unclear, ask for
it and do not submit.

Produce at least three distinct selectable units: one direct interpretation
and at least two close reformulations, measurable proxies, or better-specified
interpretations that preserve the user's intent. Every unit contains one
Yes/No question. For a binary forecast,
omit `variables` or use an empty list; the question has no placeholders. For a
scalar or categorical forecast, include named finite variables with allowed
values and use matching angle-bracket placeholders in the question. Values may
be non-overlapping ranges on one numeric measure or mutually exclusive
categorical outcomes.

For variable-backed units, place each placeholder in a grammatical slot whose
surrounding words work with every allowed value after substitution. Values
must be complete phrases for that slot, not labels that only make sense when
the placeholder name is read; for example, use “Will the price be <range>?”
with values such as “below $80,000” and “$200,000 or more”, not “Which <range> applies?”.
Before submitting, mentally substitute every allowed value into the question
and verify that each resulting question is grammatical, natural, and faithful
to the intended meaning. Revise the wording or values whenever any substitution
fails that check.

## Variable invariance

Use variables only for at least two related values with stable wording.
Replace each varying finite parameter with one descriptive placeholder such as
`<range>` or `<candidate>` and list its values under a same-named variable.
Every value and meaningful combination must retain the same qualifying
predicate, interpretation, jurisdiction, legal/compliance treatment,
authoritative source hierarchy, source identity, formula, settlement procedure,
and methodology. If any value needs a different rule, source, settlement
method, or interpretation, split the unit. Never use a broad wildcard or add
values merely to create a variable. Selection preserves the complete unit and
does not instantiate one variable value.

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
