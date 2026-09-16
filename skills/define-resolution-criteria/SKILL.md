---
name: define-resolution-criteria
description: Define source-grounded resolution criteria for every binary question represented by a selected binary, scalar, categorical, or template forecast specification after its resolution sources are approved.
---

# Purpose

Use this skill after the user has selected a forecast specification unit, agreed
to its definitions, and approved its resolution-source hierarchy. Turn the
approved unit, definitions, and sources into structured criteria that let two
careful readers reach the same result for each constituent binary question
without settlement-time discretion.

Read [references/criteria-spec.md](references/criteria-spec.md) before defining
or submitting criteria. It contains the exact payload shape and validation
rules.

## Grilling gate

Before constructing or submitting the payload, use the adapted round-based
decision-interview workflow from Matt Pocock's `grilling` skill. The adaptation
is documented in [THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md).

This is an interactive gate, not a request to present recommendations. Do not
call `submit_resolution_criteria` until the user has answered every frontier
round. Once no decision remains, construct the criteria and submit them
directly. Do not show a separate pre-submission criteria draft or ask for a
second confirmation: the submitted, rendered criteria are the user's single
criteria review, and their approval of that response authorizes the approval
tool call.

1. Map only the criteria decisions that are relevant to the selected unit as a
   design tree: each decision branches into the later decisions that depend on
   it. Do not turn examples or possible resolution mechanisms into mandatory
   checklist questions.
2. Identify the current frontier: every decision whose prerequisites are
   settled and that can be answered without guessing.
3. Track the grilling-round count from the first question round. Before the
   questions in every round, state the current round and the maximum number of
   grilling rounds expected for this session. Write the progress line and
   fixed labels in the user's current conversation language. The English
   examples below show the format; adapt them to the conversation instead of
   treating English or another language as fixed. For example:
   `🧭 Grilling round 1 of 1 total (exact).` and
   `🧭 Grilling round 2 of about 2 total (estimate).` When the mapped design tree
   makes the maximum knowable, mark it exact. When adaptive branches or
   unresolved user input prevent an exact count, give a conservative estimate
   instead. On an estimated round, immediately add a
   practical suggestion for reducing the maximum: answer every question in
   that round in one response, explicitly accept or reject each recommendation,
   include any free-form fallback, and state any decisions that logically
   follow from those answers. Preserve prerequisite order and never skip an
   unresolved decision just to reduce the count. If a
   branch makes the estimate change, update it in the next round rather than
   presenting stale progress.
4. Ask the whole frontier in one numbered round. Every user-dependent decision
   must be a separate question with no more than three distinct, reasonable,
   substantive possibilities and a recommendation. Prefer two or three when
   that many genuinely defensible paths exist; do not pad the list with weak,
   duplicate, or merely cosmetic variants. Do not collapse several decisions
   into one prose prompt or give only a list of recommendations.

   Keep a free-form escape hatch separate from the counted possibilities. After
   the choices, explicitly invite the user to say what should happen if none of
   them fits (for example, “If none of these fits, tell me what you would
   prefer or what outcome you want instead.”). This invitation is not a fourth
   option and must not be numbered as one. Do not force the user to choose a
   listed possibility when all of them are unsuitable.

   Format every round using this structure, adapted from the upstream
   `grilling` skill. Translate fixed labels and prompts, including the progress
   line and the free-form invitation, into the user's current conversation
   language; keep the question numbering, symbols, and separators:

   ```text
   🧭 Grilling round <current> of <total> total (exact).

   ❓ **Q1** - **<short question title>**: <question with at most three explicit choices>

   ↪️ If none of these options fits, tell me what you would prefer or how you would like to proceed instead.

   ➡️ <Recommendation>

   ---

   ❓ **Q2** - **<short question title>**: <question with at most three explicit choices>

   ↪️ If none of these options fits, tell me what you would prefer or how you would like to proceed instead.

   ➡️ <Recommendation>
   ```

   If the maximum is only an estimate, translate the English example
   `🧭 Grilling round <current> of about <estimate> total (estimate).` into the
   user's current conversation language, then put the round-reduction
   suggestion immediately below it. The progress line and suggestion must
   appear before `Q1` in every round, including the final round. The maximum
   counts question rounds only; it does not count criteria submission or its
   single user approval.

   Number questions consecutively within the round. Include the question title,
   no more than three decision options, the free-form fallback invitation, and
   the recommended option in the same round. The `---` separator belongs
   between questions and after the final question.

5. Wait for the user's answers, record the settled decisions, and recompute
   the frontier. A free-form answer to the fallback invitation is a valid
   decision input: clarify it only when necessary, record the user's intended
   action or outcome, and then recompute the frontier. If the user says that
   none of the choices works but does not say what should happen instead, ask
   them for that missing direction. Do not ask a downstream question in the
   same round as an unanswered prerequisite.
6. Resolve factual prerequisites from the approved material and available
   tools yourself; ask the user only for choices that require their judgment.
7. Continue until every branch has been visited and nothing remains silently
   assumed. Then construct the complete criteria and proceed directly to
   submission. Do not present a separate criteria draft or ask for confirmation
   before submission; the rendered submission is the single criteria review.

For each round, make the complete round the final user-visible response for that
turn. The final response must contain the progress line, any required
estimate-reduction suggestion, every question, each free-form fallback
invitation, every recommendation, and the `---` separators. Do not emit the
round only as an intermediate commentary or progress update, and do not replace
it with a second final response containing only a generic prompt such as
“Please answer the questions.” After the complete round is visible, stop and
wait. A response such as “I agree” to recommendations
does not answer a question whose options were not explicitly presented. If the
user answers only some questions, preserve the settled answers, recompute the
frontier, and ask the remaining questions before proceeding.

## Workflow

1. Confirm that exactly one unit is in scope and that its selected-unit,
   definitions, and resolution-sources stages are explicitly approved. If any
   prerequisite is missing, stop and return to that stage.
2. Apply the [Grilling gate](#grilling-gate), then submit the criteria directly
   when all decisions are settled. The rendered submission is the only criteria
   review before the user approves it.
3. Keep the selected unit, including every template placeholder, variable, and
   allowed value, exactly unchanged. Define criteria against the agreed terms
   and the approved sources, not against an informal rewrite of the question.
4. Create one `questionRules` entry for every binary question represented by
   the selected unit:
   - a binary unit has one entry for its exact question;
   - a scalar or categorical unit has one entry for every exact question in
     its `questions` array;
   - a template unit has one entry for its exact placeholder-bearing question,
     with one rule that applies uniformly to every allowed substitution using
     the same approved source, formula, procedure, and methodology. Do not add
     value-specific mappings. If any value changes the qualifying predicate,
     interpretation, or legal/compliance analysis, stop and return to drafting
     so the cases can be separate units.
5. State complete `resolvesYesWhen` and `resolvesNoWhen` conditions for each
   entry. Use whatever source-grounded logic the question requires, including
   comparisons, occurrences, rankings, calculations, classifications,
   durations, combinations, or source-defined statuses. These are examples,
   not a closed list. Do not force a criterion kind or comparator vocabulary.
6. Complete the two shared rule sections:
   - `evidenceAndSourceRules` states what public evidence controls and how the
     approved source hierarchy is applied. Address corrections, revisions,
     conflicts, or unavailable evidence only when they can affect this unit.
   - `exceptionAndUnresolvedRules` states how relevant boundaries, ties,
     multiple or absent matches, postponements, cancellations, and unresolved
     outcomes are handled. Do not invent a fixed number of edge cases or add
     irrelevant boilerplate.
     For scalar and categorical units, make the question rules coherent as a
     set so the intended number of questions resolves Yes, including at range or
     category boundaries.
7. Call `submit_resolution_criteria` exactly once with the exact selected unit,
   unit number, carried `forecast_specification_id`, complete
   `resolution_criteria`, and a follow-up asking whether the user agrees or
   wants changes. This submission is pending and does not imply approval.
8. Present the tool's complete returned Markdown faithfully, translating only
   renderer-generated labels and fixed UI text into the user's language. After
   the user agrees, call `approve_forecast_specification` with
   `stage: "resolution_criteria"`. The workflow is not complete at this point:
   continue with `define-background-information` and do not present the complete
   forecast specification until that final stage is approved.

## Validation-error recovery

If submit_resolution_criteria returns an input-validation error, treat the
submission as rejected before persistence. Use the reported field path and
message to correct only the offending value, preserve every other value
unchanged, and retry with the corrected full payload.

Do not print or ask the user to review the full criteria again after this retry.
Show only the updated field and value that caused the error, and explain that
the first submission was rejected before saving, the existing forecast
specification was not changed, and the corrected submission is pending. If a
second validation error occurs, show only that next field and corrected value.

This recovery behavior overrides the normal instruction to present the complete
returned Markdown for the failed submission.

## Boundaries

- Do not draft a new display question, redefine approved terms, or replace the
  approved source hierarchy in this skill.
- Do not call `submit_resolution_criteria` before
  `resolution_sources` is approved.
- Do not invent an observation window, deadline, source, comparison,
  calculation, classification, or factual outcome. If the approved material is
  insufficient to define a rule, ask for the missing information.
- Do not treat a source's existence as evidence that a question resolves Yes;
  specify the exact public evidence that establishes the outcome.
- Do not call the approval tool until the user explicitly agrees to the
  submitted criteria.
