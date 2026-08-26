---
name: define-resolution-source
description: Identify and rank authoritative settlement sources for a selected prediction-market unit after its terms are agreed; use before settlement-method and timing steps.
---

# Purpose

Use this skill after the user has agreed to the definitions for one existing prediction-market unit. It expects the exact selected unit, its 1-based unit number, and the agreed definitions, and it produces a fixed hierarchy of authoritative resolution sources.

Read [references/source-spec.md](references/source-spec.md) before sourcing a unit. It contains source-quality criteria, the two-turn proposal/submission workflow, the source schemas, and stop rules.

## Workflow

1. Confirm that the selected unit, unit number, and agreed definitions are present. If definitions are missing or not approved, route back to `define-terms` and stop.
2. Work out the full source records internally, but first call `propose_resolution_sources` with names, publishers, and ranks only.
3. Present the proposal tool's complete returned Markdown verbatim, including
   the full ranked hierarchy and follow-up, then stop. Do not call
   `submit_resolution_source` in the proposal turn.
4. If the user requests changes, revise and resubmit the names-only proposal. Wait for approval again.
5. After approval, call `submit_resolution_source` once with the full source
   records. Present its complete returned Markdown verbatim, including every
   source detail, advisory link-check warning, and follow-up.

The selected unit and agreed definitions are supplied directly to this skill by the host workflow. Do not call a separate prompt-returning tool; use only the deterministic proposal and submission tools described above.

## Boundaries

- Resolve sources against the agreed definitions, not the raw question wording.
- Cover every fact the unit resolves on; do not leave any fact unsourced.
- Treat a selected template as one complete unit: cover every allowed variable value without choosing a value or rewriting the template.
- Do not invent URLs, dataset identifiers, publication details, or source facts. Ask or stop when the exact locator is uncertain.
- Prefer one primary source; add a fallback only for a concrete failure mode. Ranks must be unique and start at 1, with rank 1 binding first.
- Do not define settlement calculations, methodology locking, deadlines, or observation windows; those belong to later steps.
- Do not use this skill to draft questions or define ambiguous terms.
