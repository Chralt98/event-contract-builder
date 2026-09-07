# Resolution-source specification

Read this reference when identifying and ranking sources for a selected prediction-market unit after its definitions have been agreed.

## Role and goal

Act as a prediction market resolution designer. Given one market unit and the agreed definitions of its terms, identify the authoritative data source or sources that will settle it and rank them into a fixed fallback hierarchy.

Be rigorous and settlement-minded. A source is good enough only when, on the resolution date, two people could independently read the same published value and reach the same outcome without judgment calls.

Name the specific source that establishes each fact the unit resolves on. Fix the binding order before launch; never leave source choice discretionary at settlement.

## Input boundary

The input must contain:

- `unit_number`: the 1-based number from the prior draft;
- `selected_unit`: the exact binary, scalar, categorical, or template market unit; and
- `definitions`: the agreed term-to-definition map for that unit.

Resolve against the agreed definitions rather than the raw question wording. If the definitions are absent or not approved, stop and return to the term-definition workflow.

For a template unit, keep the placeholder-bearing question and every variable value unchanged. The proposed hierarchy must cover all allowed variations; do not select one value or silently reduce the template to a concrete question.

## Source-quality criteria

Each source should be:

- **Authoritative:** the recognized origin of the fact, not a re-reporter or aggregator that could disagree with the origin;
- **Public:** readable at resolution time without a paywall or login, or explicitly marked as not publicly accessible;
- **Independent:** not influenceable by a market participant and independently
  produced by a distinct source agency. A second page, dataset, mirror,
  re-publication, or alternate label from the same agency is not an independent
  source;
- **Scheduled:** published on a known cadence so later timing can be anchored to it; and
- **Fit-for-purpose locator:** linked to the exact durable event page when known; otherwise linked to the publisher's stable canonical results, data, or topic hub. Include the publisher's `datasetId` when one exists.

Default to at least one primary source and one lower-ranked, independent
fallback source. The primary is rank 1 and the fallback is rank 2; add further
sources only for a concrete additional failure mode, such as the primary
becoming unavailable or stopping publication. The `publisher`/source agency
must not repeat across the hierarchy, and exact source URLs must be unique. A
different publisher is not enough when it merely republishes or mirrors the
same upstream value: do not describe that as independent corroboration.

If no independent fallback exists, a user-approved single rank-1 source is
valid, but the MCP tools display a visible `⚠` warning that no independent
fallback was found or approved. The proposal must also offer a nearby or proxy
market as a complete selectable unit with at least two independent sources.
Never use a vague “or similar” fallback.

## URL locator policy

The `url` is a user-facing inspection locator for the source. It should help a
user identify and verify the publisher without pretending that a future value
is already available at that address.

Select the most specific durable URL available:

1. Prefer a known, stable event-specific results or data page that is intended
   to publish the fact being resolved.
2. If that page is not yet known or does not exist, use the source's canonical
   results, data, or topic hub where the future publication is expected.
3. Keep methodology pages, press releases, and documentation as supporting
   references only; do not use them as the binding data locator when a suitable
   results/data page or hub exists.

Do not use a historical page for a different event, a guessed future path, an
ephemeral session URL, or a URL carrying tracking parameters. The HTTP-200
preflight checks reachability only; it does not prove that the page is
authoritative, relevant, or populated with the required fact.

## Constraints

- Every fact the question turns on must be covered by one or more sources' `controlsFor` fields.
- If a required fact has no authoritative primary source, do not imply that the
  selected market is fully resolvable. List the fact in `coverage_gaps` and
  use the `draft-display-question` workflow to offer an `alternative_market`
  with a new display question that preserves the user's intent as closely as
  possible, describes it indirectly as a proxy, or improves the question. Its
  `sources` array must contain at least two independent source agencies.
- Ranks must be unique and start at 1; rank 1 is the primary source that binds first.
- Give each source a stable, unique `id` slug.
- Do not invent URLs or dataset identifiers. Apply the URL locator policy when an event-specific locator is uncertain; ask the user or leave the source unresolved only when no stable official locator can be established.
- Do not specify how a settlement value is calculated from a source.
- Do not specify deadlines, observation windows, or resolution periods; those are later steps.

## Coverage gaps and alternatives

Both deterministic source tools accept these optional fields:

```text
coverage_gaps[]
alternative_market:
  unit_number
  display_question_unit
  rationale
  sources[]: name, publisher, url
```

Use `coverage_gaps` for each fact that lacks a primary source. Use
`alternative_market` when a required fact is uncovered or when no independent
fallback exists. The alternative must include a newly drafted, complete
connector-safe `display_question_unit` (binary, scalar, categorical, or
template) and a unit number that can become the selected unit only after the
user chooses it. It is a display-question suggestion, not a definitions map
and not a silent replacement of the selected unit. Its source list must contain
at least two distinct, independent source agencies; the tools reject repeated
publishers and URLs. Explain whether the alternative is a close reformulation,
a proxy market, or a better proposal for the user's intent.

## Two-turn workflow

Work out the full records internally, but reveal the hierarchy in two turns. The MCP tools own the visible Markdown in both turns; present each returned result faithfully, translating renderer-generated English labels and other fixed UI text into the user's language while preserving source data.

### Turn 1: propose the hierarchy

Call `propose_resolution_sources` with:

- `contract_id`: the stable identifier returned by the draft/definition tool
  when continuing that contract; omit it only when starting a new alternative
  market record;
- `unit_number`: the selected unit's 1-based number;
- `selected_unit`: the exact selected unit;
- `sources`: by default, a ranked array containing a rank-1 primary and rank-2
  independent fallback, with each source's `rank`, `name`, `publisher`, and
  URL selected under the URL locator policy. Use distinct source agencies. If the user explicitly chooses
  primary-only, pass one rank-1 source; the tool will render the warning that
  no independent fallback was found or approved. Include `coverage_gaps` and
  `alternative_market` whenever applicable. The alternative's new display
  question unit and unit number are shown as a selectable handoff to
  `define-terms`; and
- `followUp`: one sentence asking whether the hierarchy is correct or should
  be changed, for example: “Does this source hierarchy look right, or should we
  add, remove, or reorder any source?” When a warning or gap is present, the
  follow-up must also ask whether the user prefers the displayed alternative.

Present the complete returned Markdown faithfully, including the full ranked
hierarchy and follow-up, translating renderer-generated English labels and
other fixed UI text into the user's language while preserving source data, then
stop. Do not call `submit_resolution_source` in Turn 1.

If the user selects the displayed alternative instead of approving the current
unit's hierarchy, stop this source step and start a separate record by
submitting and explicitly approving the alternative's exact
`display_question_unit` with `submit_selected_unit` and
`approve_event_contract` at `stage: "selected_unit"`. Then route the same unit
as `selected_unit`, together with its `unit_number`, to `define-terms`, omitting
the original contract ID. Do not submit the original hierarchy or carry over
the original definitions. The alternative source list is only a candidate set
until the new definitions are agreed.

Each URL is rendered as a clickable Markdown link so the user can inspect the
candidate source before approval. Before rendering, the deterministic proposal
tool silently checks every main and alternative-market URL with the shared
reachability check and keeps only links whose final response is exactly HTTP
`200`; it does not render the check result or failure details. If a main source
fails, the tool removes it and closes the remaining ranks. If fewer than two
alternative sources pass, it omits that alternative rather than showing an
unverified link. If no main source passes, the tool returns no proposal so the
workflow can source replacement URLs. If the user requests changes, revise the
concise proposal and call `propose_resolution_sources` again. Do not advance to
Turn 2 until the user approves the hierarchy.

### Turn 2: detail and register

Only after the user approves the hierarchy, call `submit_resolution_source` with:

- `contract_id`: the same identifier returned by the proposal tool;
- `unit_number` and `selected_unit` unchanged from Turn 1;
- `sources`: the complete ranked records, normally including the rank-1 primary
  and rank-2 independent fallback. A user-approved primary-only hierarchy may
  contain one rank-1 record and must retain the tool's warning about having no
  independent fallback; carry `coverage_gaps` and `alternative_market` through
  unchanged only when continuing with this unit; and
- `followUp`: one sentence asking whether the detailed sources are correct or
  should be changed.

Each full source record contains:

```text
id
rank
name
publisher
url
datasetId (optional)
publicationSchedule
controlsFor[]
publiclyAccessible
independenceNote
```

`submit_resolution_source` validates the full source records and renders the
user-facing source detail. Its Markdown intentionally omits transient URL
reachability statuses and the `publiclyAccessible` metadata; those remain in
the validated structured payload. It still checks each URL and retains one
aggregate warning when a source is unavailable. Present the complete returned
Markdown faithfully, including every rendered source detail, warning,
alternative, and follow-up. Translate renderer-generated English labels and
other fixed UI text into the user's language while preserving source data.

## Stop rules

- If the selected unit, unit number, or agreed definitions are missing, stop and request them.
- If the user has not approved the proposed hierarchy, do not call `submit_resolution_source`.
- If no event-specific URL is known, apply the URL locator policy and use the best stable official hub available. Do not guess a future path or invent a dataset identifier; ask the user or leave the source unresolved only when no stable official locator can be established.
- If a source cannot cover a fact the unit resolves on, expose the gap and
  offer the alternative rather than submitting an apparently complete source
  set. Do not silently rewrite the selected question.
- If only one source is intentionally selected, keep it at rank 1 and preserve
  the visible warning about having no independent fallback; include a concrete
  nearby/proxy alternative unit with at least two independent sources.
- If the user selects that alternative display-question unit, start a separate
  record by submitting and explicitly approving its exact selected unit with
  `submit_selected_unit` and `approve_event_contract` at
  `stage: "selected_unit"`. Then route it to `define-terms` as `selected_unit`
  with its own unit number, omitting the original contract ID. Redo definitions
  from scratch for the new unit, and then re-evaluate its candidate sources. Do
  not register the original hierarchy.
- Do not move into settlement calculation or timing in this step.
