# Resolution-criteria specification

Convert one exact unit, its approved definitions, and its approved source
hierarchy into deterministic rules for every binary question it represents.

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

## Criteria

Create one `questionRules` entry for the exact binary or template question, or
one for every exact scalar/categorical question. Template rules must apply one
source, formula, procedure, and methodology uniformly to all substitutions; if
treatment varies, return to drafting.

`resolvesYesWhen` states every necessary and sufficient condition, including
the deadline. `resolvesNoWhen` is only the concise complement: No when the
complete Yes condition is not met by the deadline. Do not repeat negative
versions of every Yes element or force a closed criterion taxonomy.

`evidenceAndSourceRules` identifies controlling public evidence and applies the
approved hierarchy. Address corrections, revisions, conflicts, fallback, or
non-publication only when relevant. `exceptionAndUnresolvedRules` handles only
material boundaries, ties, multiple or absent matches, postponement,
cancellation, or unresolved outcomes. Scalar and categorical rules must be
coherent as a set.

## Submission and recovery

After all interview decisions are settled, call
`submit_resolution_criteria` once; the rendered submission is the only
criteria review before approval. Do not show a separate draft. Render each rule
as one prose paragraph ending with the localized equivalent of “Otherwise it
resolves to No.” Do not append the internal No complement or repeat exact
question text inside the criteria; grouped rules may use `Question 1`,
`Question 2`, and so on.

After explicit approval, approve `resolution_criteria` and continue to
background information; do not present the complete specification yet. If a
validation error occurs, correct only the reported field and retry the full
unchanged remainder. Show only the corrected field and value, explaining that
the failed submission changed nothing.
