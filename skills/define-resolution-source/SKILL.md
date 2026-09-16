---
name: define-resolution-source
description: Identify and register independent authoritative resolution sources for a selected forecast specification unit after its terms are agreed.
---

# Purpose

Use this skill after the user has agreed to the definitions for one existing
forecast specification unit. It expects the exact selected unit, its 1-based unit
number, and agreed definitions, and registers the complete
ranked hierarchy in one source step.

Read [references/source-spec.md](references/source-spec.md) before sourcing a
unit. It contains source-quality criteria, the single-turn submission workflow,
the source schemas, and stop rules.

## Workflow

1. Confirm that the selected unit, unit number, and agreed definitions are
   present. If definitions are missing or not approved, route back to
   `define-terms` and stop.
2. Map every fact required by the agreed definitions to a source. For a
   template, verify that the identical rank-1 source and the same fallback
   hierarchy cover every explicitly allowed value and meaningful combination;
   do not map different values to different authorities or publication
   channels. If no shared hierarchy works, send the unit back for separate
   drafts. Prefer a rank-1 primary and a rank-2 fallback from genuinely independent source
   agencies. Do not count a second page, dataset, mirror, re-publication, or
   alias of the same agency as an independent source. For each source, verify
   that the linked locator is the publisher's likely publication channel for
   the required future fact: recurring data should have a compatible release
   cadence, while laws, policy decisions, and other event-driven outcomes
   should use the official publication channel that would carry the
   announcement when it occurs.
3. Work out the complete source records internally, then call
   `submit_resolution_source` once with the carried `forecast_specification_id`, exact
   selected unit, unit number, full ranked source records, and any applicable
   `coverage_gaps` or `alternative_forecast_specification`. Write notes, gaps,
   alternatives, and the follow-up in the record's immutable `language_code`.
   This is the only resolution-source
   submission step. There is no separate source-hierarchy proposal or approval
   stage.
4. Present the tool's complete returned Markdown faithfully, including every
   source detail, warning, alternative, and follow-up, translating only
   renderer-generated English labels and fixed UI text into the locked
   specification language. Then stop and wait for
   the user's approval or requested changes.
5. After the user approves the detailed hierarchy, call
   `approve_forecast_specification` with `stage: "resolution_sources"`. If the user
   requests changes, revise and resubmit the complete hierarchy instead.

## Boundaries

- Do not submit or approve sources while definitions are only pending.
- Do not define resolution calculations, methodology locking, deadlines, or
  observation windows; those belong to the earlier workflow stages.
- Cover every fact the unit resolves on; do not leave any fact unsourced.
- For a template, use one identical source hierarchy for all allowed values. Do not submit value-specific source mappings; split the affected values into separate units if any needs a different publisher, publication channel, or settlement method.
- Do not silently rewrite the selected question or present a proxy as an exact
  source for the original intent.
- If no independent fallback exists, a single rank-1 source is valid only when
  the user accepts that risk. Preserve the tool warning and ask whether the user
  wants to proceed with one source, switch to a nearby/proxy
  `alternative_forecast_specification` with a newly drafted display-question unit
  and at least two independent source agencies, or provide a known fallback
  source to evaluate and add to the hierarchy.
- If a required fact has no authoritative primary source, list it in
  `coverage_gaps` and include a nearby/proxy `alternative_forecast_specification`; do not imply
  that the selected forecast specification is fully source-covered.
- If the user selects an alternative forecast specification, start a separate record by
  submitting and approving its exact selected unit, then run terms from
  scratch. Omit the original forecast specification ID and do not reuse its definitions
  or source hierarchy.

## URL locator policy

The source `url` is a user-facing inspection locator. It identifies the
publisher and should point to the place where the publisher is most likely to
publish the data or official announcement needed to resolve the forecast. It
does not assert that the linked page already contains the future forecast
specification's final value.

Choose the durable publication locator that best matches the fact being
resolved:

1. Use a known, stable event-specific results or data page only when it is
   explicitly intended to receive the relevant result or is part of a recurring
   publication system that will reasonably be updated for this event.
2. Otherwise use the source entity's stable canonical publication hub where
   the future item is most likely to appear: for example, its official legal
   gazette, legislation/results search, official statistics or data portal,
   registry, or press-release/newsroom index. For an announcement forecast,
   prefer the entity's announcement channel over a historical announcement,
   background FAQ, parliamentary debate page, or a general topic article.
3. An individual historical press release, methodology page, documentation
   page, or explanatory article may support the source's identity or publication
   practice, but is not a binding locator unless it is itself the durable,
   updateable publication channel. A canonical press-release or newsroom hub
   is a valid binding locator when that is where the entity publishes such
   announcements.

Before submission, ask of every URL: “Would this publisher reasonably be
expected to publish the exact future fact here when it becomes available?” If
the answer is no, find the entity-level publication hub or record the source
gap rather than substituting a page that merely discusses the topic. Never use
a page for a different historical event, an ephemeral session or tracking URL,
or a guessed future path. The user should be able to reach the locator without
special access and identify the relevant future publication from that hub.
