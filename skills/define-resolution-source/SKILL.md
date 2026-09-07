---
name: define-resolution-source
description: Identify and rank independent authoritative settlement sources for a selected prediction-market unit after its terms are agreed; surface source gaps and offer intent-preserving alternatives before settlement-method and timing steps.
---

# Purpose

Use this skill after the user has agreed to the definitions for one existing prediction-market unit. It expects the exact selected unit, its 1-based unit number, and the agreed definitions, and it produces a fixed hierarchy of authoritative resolution sources.

Read [references/source-spec.md](references/source-spec.md) before sourcing a unit. It contains source-quality criteria, the two-turn proposal/submission workflow, the source schemas, and stop rules.

## Workflow

1. Confirm that the selected unit, unit number, and agreed definitions are present. If definitions are missing or not approved, route back to `define-terms` and stop.
2. Map every fact required by the agreed definitions to a source before
   proposing the hierarchy. Prefer a rank-1 primary and a rank-2 fallback from
   genuinely independent source agencies. Do not count a second page, dataset,
   mirror, re-publication, or alias of the same agency as an independent
   fallback. The tools also reject repeated publishers and exact URLs.
3. If no independent fallback can be found, a single rank-1 primary is valid
   when the user accepts the risk, but use the `draft-display-question` rules
   to propose a genuinely new nearby, proxy, or improved display question.
   Pass that new display-question unit in `alternative_market` with its next
   available unit number and at least two independent source agencies. If a
   required fact has no authoritative primary source, list it in
   `coverage_gaps`, say that the selected market is not fully source-covered,
   and offer the same kind of display-question alternative. Do not put new
   definitions in `alternative_market`, silently change the selected question,
   or present a proxy as an exact source for the original intent.
4. Work out the full source records internally, then call
   `propose_resolution_sources` with the carried `contract_id` when available,
   each source's rank, name, publisher, and a URL selected under the URL locator
   policy below plus any applicable
   `coverage_gaps` and `alternative_market`. An
   `alternative_market` contains `unit_number`, a newly drafted
   `display_question_unit`, a rationale, and candidate source identities. It
   is a display-question proposal, not a definitions map or an already
   selected unit. If no gap exists, omit `coverage_gaps`; if the ordinary
   two-source hierarchy is available, omit the alternative unless it is useful
   to the user. The proposal tool silently preflights every clickable URL and
   keeps only links whose final response is exactly HTTP `200`; do not expose
   those statuses or failure details to the user. If no main source survives,
   source replacement URLs are needed before a proposal can be shown.
5. Present the proposal tool's complete returned Markdown faithfully, including
   the full ranked hierarchy and follow-up, translating renderer-generated
   English labels and other fixed UI text into the user's language while
   preserving source data, then stop. Do not call `submit_resolution_source` in
   the proposal turn.
6. If the user selects the displayed `alternative_market`, stop the original
   source workflow and start a separate record by submitting the exact
   `display_question_unit` with its `unit_number` through
   `submit_selected_unit`, then approving it with
   `approve_event_contract` at `stage: "selected_unit"`. Only after that
   approval, route the same unit to `define-terms`. Omit the original contract
   ID; do not submit the original hierarchy or reuse the original definitions.
   The alternative's source identities are candidates that must be re-evaluated
   after its new definitions are agreed.
7. If the user requests source-hierarchy changes instead, revise and resubmit
   the concise proposal. Wait for approval again.
8. After approval of the original hierarchy, call `submit_resolution_source`
   once with the same `contract_id`, the full source records, and carry any
   `coverage_gaps` and `alternative_market` through unchanged. Present its
   complete returned Markdown faithfully, including every
   rendered source detail, warning, alternative, and follow-up; the renderer
   still checks source URLs and retains one aggregate unavailable-source warning,
   but intentionally omits transient individual link-check statuses and
   `publiclyAccessible` metadata from that user-facing Markdown. Translate
   renderer-generated English labels and other fixed UI text into the user's
   language while preserving source data.

The selected unit and agreed definitions are supplied directly to this skill by the host workflow. Do not call a separate prompt-returning tool; use only the deterministic proposal and submission tools described above.

## URL locator policy

The source `url` is a user-facing inspection locator. It identifies the
publisher and gives the user a place to verify the source; it does not assert
that the linked page already contains the future market's final value.

Choose the most specific durable locator available:

1. Use an event-specific results page when the exact page is known, stable, and
   intended to publish the fact that settles this market.
2. Otherwise use the publisher's stable canonical results, data, or topic hub
   where the future publication is expected to appear.
3. Use a methodology page, press release, or documentation page only as a
   supporting reference for source identity or publication practice, never as
   the binding data locator when a results/data locator is available.

Never use a page for a different historical event, an ephemeral session or
tracking URL, or a guessed future path. A reachability check confirms only
that the link is available; it does not establish authority, relevance, or
that the page contains the required fact. If no event-specific page exists,
the canonical hub is the correct locator rather than an unrelated historical
page.

## Boundaries

- Resolve sources against the agreed definitions, not the raw question wording.
- Cover every fact the unit resolves on; do not leave any fact unsourced.
- Treat source-agency independence as substantive: different URLs or dataset
  labels do not make the same publisher, upstream provider, mirror, or
  re-publication independent. Prefer independently produced values from
  distinct agencies, and explain uncertainty rather than overstating
  independence.
- Treat a selected template as one complete unit: cover every allowed variable value without choosing a value or rewriting the template.
- Do not invent URLs, dataset identifiers, publication details, or source facts. Use the URL locator policy when an event-specific locator is unavailable; ask or stop only when no stable official locator can be established.
- Default to at least two sources: rank 1 is the primary source and rank 2 is
  the independent fallback used for a pre-specified primary-source failure. A
  user may explicitly choose only the rank-1 primary; that is valid but the
  tool must display its warning that no independent fallback was found or
  approved, and the proposal should include a nearby/proxy alternative. Add
  further sources only for concrete additional failure modes. Ranks must be
  unique and contiguous, with rank 1 binding first.
- When no primary source exists for a required fact, expose the fact in
  `coverage_gaps` and use `draft-display-question` to propose an
  `alternative_market` whose new display question is close to the user's
  intent, describes it indirectly as a proxy, or is a better formulation. The
  alternative must be a complete selectable display-question unit with a
  usable unit number and at least two independent sources; let the user choose
  it rather than swapping it in silently.
- If the user chooses the alternative, restart term definition for that exact
  unit. Do not carry over the original unit's definitions or source hierarchy;
  re-run resolution-source selection after the alternative's definitions are
  approved.
- Do not define settlement calculations, methodology locking, deadlines, or observation windows; those belong to later steps.
- Do not use this skill itself to draft questions or define ambiguous terms.
  When source coverage requires an alternative, use the
  `draft-display-question` skill for the new display-question wording and
  return to this skill to show it as the selectable alternative.
