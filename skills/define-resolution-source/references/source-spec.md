# Resolution-source specification

Read this reference when identifying and registering sources for one selected
prediction-market unit after its timing and definitions have been approved.

## Role and goal

Act as a prediction-market resolution designer. Given one market unit, its
agreed definitions, and approved timing, identify authoritative sources and
register a fixed hierarchy that lets two careful readers reach the same result
without settlement-time discretion.

## Required inputs

The workflow must contain:

- `unit_number`: the 1-based number from the selected draft;
- `selected_unit`: the exact binary, scalar, categorical, or template unit;
- `definitions`: the agreed term-to-definition map; and
- the approved timing, including its event boundary or observation window and
  expiration.

If the selected unit, approved timing, or agreed definitions is missing, stop
and return to the corresponding earlier workflow stage.

## Source-quality criteria

Each source should be:

- **Authoritative:** the recognized origin of the fact, not an aggregator or
  re-reporter that could disagree with the origin;
- **Public:** readable at resolution time without a paywall or login, or
  explicitly marked as not publicly accessible;
- **Independent:** independently produced by a distinct source agency and not
  influenceable by a market participant;
- **Scheduled:** published on a known cadence that fits the approved timing;
  and
- **Fit-for-purpose:** linked to the exact durable event page when known,
  otherwise to the publisher's stable canonical results, data, or topic hub.

Default to at least one rank-1 primary and one rank-2 independent fallback.
Ranks must be unique and contiguous, with rank 1 binding first. Add further
sources only for a concrete additional failure mode or because the contract's
approved terms expressly require multiple sources. A second page, dataset,
mirror, re-publication, or alternate label from the same agency is not an
independent source.

If no independent fallback exists, a user-approved single rank-1 source is
valid but must retain the tool's warning. When appropriate, include a nearby
or proxy alternative market with at least two independent source agencies.

## URL locator policy

The `url` is a user-facing inspection locator, not a guarantee that the future
value is already published there.

1. Prefer a known, stable event-specific results or data page.
2. Otherwise use the publisher's stable canonical results, data, or topic hub.
3. Use methodology pages, press releases, and documentation only as supporting
   references when a results/data locator is unavailable.

Do not use a historical page for a different event, a guessed future path, an
ephemeral session URL, or tracking parameters. The URL is an inspection
locator only; the user should verify that it is reachable, authoritative,
relevant, and suitable for the contract.

## Single-turn submission

After sourcing, call `submit_resolution_source` once with:

- the carried `contract_id`;
- the exact selected unit and unit number;
- the full ranked `sources` records, each containing `id`, `rank`, `name`,
  `publisher`, `url`, `publicationSchedule`, `controlsFor`,
  `publiclyAccessible`, and `independenceNote`;
- `coverage_gaps` when any required fact lacks authoritative primary coverage;
- `alternative_market` when a nearby/proxy display-question proposal is
  needed; and
- a follow-up asking whether the detailed hierarchy is correct or should be
  changed.

The tool renders the heading **Resolution Source Hierarchy**, source details,
warnings, alternatives, and the follow-up in one response. Do not call a
separate source-proposal tool or introduce a source-proposal approval stage.

Only after the user approves that response, call
`approve_event_contract` with `stage: "resolution_sources"`. If the user
requests changes, resubmit the complete hierarchy and wait for approval again.
