# Resolution-source specification

Read this reference when identifying and registering sources for one selected
forecast specification unit after its definitions have been approved.

## Role and goal

Act as a forecast specification resolution designer. Given one forecast specification unit, its
agreed definitions, identify authoritative sources and
register a fixed hierarchy that lets two careful readers reach the same result
without resolution-time discretion.

## Required inputs

The workflow must contain:

- `unit_number`: the 1-based number from the selected draft;
- `selected_unit`: the exact binary, scalar, categorical, or template unit;
- `definitions`: the agreed term-to-definition map; and
- the timeframe stated by the selected display question.

If the selected unit or agreed definitions is missing, stop and return to the
corresponding earlier workflow stage.

## Source-quality criteria

Each source should be:

- **Authoritative:** the recognized origin of the fact, not an aggregator or
  re-reporter that could disagree with the origin;
- **Public:** readable at resolution time without a paywall or login;
- **Independent:** independently produced by a distinct source agency and not
  influenceable by a forecast specification participant;
- **Scheduled:** published on a known cadence that fits the display question's timeframe;
  and
- **Fit-for-purpose:** linked to the exact durable event page when known,
  otherwise to the publisher's stable canonical results, data, or topic hub.

Default to at least one rank-1 primary and one rank-2 independent fallback.
Ranks must be unique and contiguous, with rank 1 binding first. Add further
sources only for a concrete additional failure mode or because the forecast specification's
approved terms expressly require multiple sources. A second page, dataset,
mirror, re-publication, or alternate label from the same agency is not an
independent source.

If no independent fallback exists, a user-approved single rank-1 source is
valid but must retain the tool's warning. The follow-up must ask whether the
user wants to proceed with one source, use another nearby or proxy forecast
specification question with at least two independent source agencies, or
provide a fallback source they know so it can be evaluated. When appropriate,
include that nearby or proxy alternative forecast specification.

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
relevant, and suitable for the forecast specification.

## Single-turn submission

After sourcing, call `submit_resolution_source` once with:

- the carried `forecast_specification_id`;
- the exact selected unit and unit number;
- the full ranked `sources` records, each containing `id`, `rank`, `name`,
  `publisher`, and `url`;
- `coverage_gaps` when any required fact lacks authoritative primary coverage;
- `alternative_forecast_specification` when a nearby/proxy display-question proposal is
  needed; and
- a follow-up asking whether the detailed hierarchy is correct or should be
  changed.

The tool renders the heading **Resolution Source Hierarchy**, source details,
warnings, alternatives, and the follow-up in one response. Do not call a
separate source-proposal tool or introduce a source-proposal approval stage.

Only after the user approves that response, call
`approve_forecast_specification` with `stage: "resolution_sources"`. If the user
requests changes, resubmit the complete hierarchy and wait for approval again.
