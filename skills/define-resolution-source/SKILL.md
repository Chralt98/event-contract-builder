---
name: define-resolution-source
description: Identify and register independent authoritative settlement sources for a selected prediction-market unit after its timing and terms are agreed.
---

# Purpose

Use this skill after the user has agreed to the definitions for one existing
prediction-market unit. It expects the exact selected unit, its 1-based unit
number, approved timing, and agreed definitions, and registers the complete
ranked hierarchy in one source step.

Read [references/source-spec.md](references/source-spec.md) before sourcing a
unit. It contains source-quality criteria, the single-turn submission workflow,
the source schemas, and stop rules.

## Workflow

1. Confirm that the selected unit, unit number, approved timing, and agreed
   definitions are present. If timing or definitions are missing or not
   approved, route back to `define-timing` or `define-terms` and stop.
2. Map every fact required by the agreed definitions to a source. Prefer a
   rank-1 primary and a rank-2 fallback from genuinely independent source
   agencies. Do not count a second page, dataset, mirror, re-publication, or
   alias of the same agency as an independent source. Use the approved timing
   to verify that the source publication schedule can settle the unit before
   expiration; do not silently change the timing.
3. Work out the complete source records internally, then call
   `submit_resolution_source` once with the carried `contract_id`, exact
   selected unit, unit number, full ranked source records, and any applicable
   `coverage_gaps` or `alternative_market`. This is the only resolution-source
   submission step. There is no separate source-hierarchy proposal or approval
   stage.
4. Present the tool's complete returned Markdown faithfully, including every
   source detail, warning, alternative, and follow-up, translating only
   renderer-generated English labels and fixed UI text. Then stop and wait for
   the user's approval or requested changes.
5. After the user approves the detailed hierarchy, call
   `approve_event_contract` with `stage: "resolution_sources"`. If the user
   requests changes, revise and resubmit the complete hierarchy instead.

## Boundaries

- Do not submit or approve sources while timing or definitions are only
  pending.
- Do not define settlement calculations, methodology locking, deadlines, or
  observation windows; those belong to the earlier workflow stages.
- Cover every fact the unit resolves on; do not leave any fact unsourced.
- Do not silently rewrite the selected question or present a proxy as an exact
  source for the original intent.
- If no independent fallback exists, a single rank-1 source is valid only when
  the user accepts that risk. Preserve the tool warning and, when useful, add a
  nearby/proxy `alternative_market` with a newly drafted display-question unit
  and at least two independent source agencies.
- If a required fact has no authoritative primary source, list it in
  `coverage_gaps` and include a nearby/proxy `alternative_market`; do not imply
  that the selected market is fully source-covered.
- If the user selects an alternative market, start a separate record by
  submitting and approving its exact selected unit, then run timing and terms
  from scratch. Omit the original contract ID and do not reuse its definitions
  or source hierarchy.

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
tracking URL, or a guessed future path. The URL is an inspection locator only;
the user should verify that it is reachable, authoritative, relevant, and
expected to contain the required fact.
