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
- **Scheduled or event-triggered:** recurring data has a known cadence that fits
  the display question's timeframe, while laws, policy decisions, and other
  event-driven outcomes have an identifiable official publication channel that
  would carry the announcement when it occurs; and
- **Fit-for-purpose:** the URL is a durable locator where the publisher is
  reasonably expected to publish the exact required fact, not merely a page
  that discusses the topic. Use the exact event page only when it is known to
  be durable and intended for that result; otherwise use the source entity's
  stable canonical legal gazette, legislation/results search, data portal,
  registry, or press-release/newsroom hub.

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

For a template, verify that the identical rank-1 source and the same fallback
hierarchy cover every explicitly allowed value and meaningful combination.
Do not assign different publishers, publication channels, or source ranks to
different placeholder values. If any value lacks coverage under that shared
hierarchy, report the gap and return the unit to drafting for separate units;
do not patch the template with value-specific source mappings.

## URL locator policy

The `url` is a user-facing inspection locator and the expected publication
channel for the fact needed at resolution. It is not a guarantee that the
future value is already published there.

Use this decision order:

1. Use a known, stable event-specific results or data page only when it is
   explicitly intended to publish the relevant result or is part of a recurring
   publication system that will be updated for this event.
2. Otherwise use the source entity's stable canonical publication hub where
   the future item is most likely to appear, such as its official legal
   gazette, legislation/results search, official statistics or data portal,
   registry, or press-release/newsroom index. For an announcement forecast,
   use the announcement channel rather than a historical announcement,
   background FAQ, parliamentary debate page, or general topic article.
3. A historical press release, methodology page, documentation page, or
   explanatory article is supporting evidence only unless it is itself the
   durable, updateable publication channel. A canonical press-release or
   newsroom hub is a valid binding locator when that is where the entity
   publishes the relevant announcements.

For every candidate URL, ask: “Would this publisher reasonably be expected to
publish the exact future fact here when it becomes available?” If not, find the
entity-level publication hub or record the gap in coverage; do not substitute a
page that merely discusses the topic. Do not use a historical page for a
different event, a guessed future path, an ephemeral session URL, or tracking
parameters. The user should be able to reach the locator without special
access and identify the relevant future publication from that hub.

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
warnings, alternatives, and the follow-up in one response. Present them in the
shared layout: selected unit, `---`, source hierarchy, `---`, follow-up. Insert
either separator if the renderer omits it. Do not call a separate source-proposal
tool or introduce a source-proposal approval stage.

Only after the user approves that response, call
`approve_forecast_specification` with `stage: "resolution_sources"`. If the user
requests changes, resubmit the complete hierarchy and wait for approval again.
