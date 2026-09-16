# Resolution-criteria specification

Read this reference when defining criteria for one selected forecast
specification unit after its resolution sources have been approved.

## Role and goal

Convert the approved selected unit, definitions, and source hierarchy into
rules that determine the Yes/No result of every binary question represented by
that unit. Binary and template units contain one question or question pattern;
scalar and categorical units contain multiple binary questions that must be
resolved coherently as a set.

The schema deliberately does not enumerate criterion kinds, comparators, or
settlement mechanisms. A real-world question may depend on an occurrence,
comparison, ranking, classification, calculation, duration, combination of
facts, source-defined status, or another observable rule. Describe the method
the question actually requires.

## Required workflow context

The input must contain exactly one complete selected unit, its 1-based unit
number, the agreed definitions, and the approved resolution sources. Carry the
`forecast_specification_id` returned by the previous workflow step. The source
stage must already be approved before `submit_resolution_criteria` is called.

Do not alter the selected unit. Keep every question, template placeholder,
variable, and allowed value exactly unchanged.

## Payload

`submit_resolution_criteria` receives this shape:

```text
forecast_specification_id?: UUID
unit_number: integer
selected_unit: exact display-question unit
resolution_criteria:
  questionRules:
    - question: exact binary question from the selected unit, or the exact template question
      resolvesYesWhen: precise open-text rule
      resolvesNoWhen: precise open-text rule
  evidenceAndSourceRules: precise open text
  exceptionAndUnresolvedRules: precise open text
followUp: one question about agreement or requested changes
```

The text fields may contain multiple sentences, formulas, source field names,
dates, thresholds, categories, or other precise logic. They are not restricted
to controlled comparator values or a closed rule taxonomy.

## Question coverage

- For a binary unit, provide one rule for its exact `question`.
- For a scalar unit, provide one rule for every exact question representing a
  numeric range. Make boundary treatment consistent and prevent unintended
  overlaps or gaps.
- For a categorical unit, provide one rule for every exact option question.
  State how the set handles multiple matches or no match when either is
  realistically possible.
- For a template unit, provide one rule for the exact placeholder-bearing
  question. Preserve its placeholders and apply the same approved source,
  formula, procedure, and methodology uniformly to every allowed substitution.
  Do not express value-specific source or settlement mappings. If any value
  changes the qualifying predicate, interpretation, or legal/compliance
  analysis, stop and return to drafting so the affected cases are separate
  units.

Each `resolvesYesWhen` rule states the necessary and sufficient conditions for
Yes. Each `resolvesNoWhen` rule states the complement, deadline treatment, and
any explicit No condition. Together with the shared exception rules, the two
conditions must not leave ordinary cases to resolver discretion.

## Shared rules

`evidenceAndSourceRules` identifies the public evidence that establishes the
result and explains how the approved source hierarchy is applied. Include
correction, revision, conflict, fallback, or non-publication treatment when it
is relevant; do not add boilerplate for scenarios that cannot affect the unit.

`exceptionAndUnresolvedRules` handles relevant boundary cases and states what
happens when the ordinary question rules cannot determine an outcome. Consider
ties, range boundaries, multiple or absent matches, postponement, cancellation,
and missing evidence only as applicable. There is no required number of edge
cases and no fixed ambiguity-disposition enum.

## Submission and approval

Call `submit_resolution_criteria` once after the sources are approved. Present
its complete returned Markdown with the shared layout: selected unit, `---`,
resolution criteria, `---`, follow-up. Insert missing separators as
presentation formatting only, without summarizing or changing the criteria.
The submission remains pending until the user explicitly agrees. Only then
call `approve_forecast_specification` with `stage: "resolution_criteria"` and
the same `forecast_specification_id`. Criteria approval is not final approval;
continue with `define-background-information`. Do not present the complete
forecast specification until the background-information stage is approved.

If the user requests a change, revise and resubmit the complete criteria
payload. If a prerequisite is missing or the source hierarchy cannot establish
the required fact, stop and route back to the relevant earlier workflow stage;
do not silently substitute a proxy or invent a rule.

## Validation-error recovery

If submission returns an input-validation error, the payload was rejected
before it was saved. Correct only the value at the reported field path, keep all
other criteria unchanged, and retry using the complete corrected payload.

After a successful retry, do not reproduce the complete resolution criteria or
reopen review of unchanged fields. Show only the corrected field and value, and
explain that the existing forecast specification was not changed while the
failed submission was being repaired. If another validation error occurs, show
only that next field and corrected value.
