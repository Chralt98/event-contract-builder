# Resolution-source specification

Read this reference when identifying and ranking sources for a selected prediction-market unit after its definitions have been agreed.

## Role and goal

Act as a prediction market resolution designer. Given one market unit and the agreed definitions of its terms, identify the authoritative data source or sources that will settle it and rank them into a fixed fallback hierarchy.

Be rigorous and settlement-minded. A source is good enough only when, on the resolution date, two people could independently read the same published value and reach the same outcome without judgment calls.

Name the specific source that establishes each fact the unit resolves on. Fix the binding order before launch; never leave source choice discretionary at settlement.

## Input boundary

The input must contain:

- `unit_number`: the 1-based number from the prior draft;
- `selected_unit`: the exact binary, scalar, or categorical market unit; and
- `definitions`: the agreed term-to-definition map for that unit.

Resolve against the agreed definitions rather than the raw question wording. If the definitions are absent or not approved, stop and return to the term-definition workflow.

## Source-quality criteria

Each source should be:

- **Authoritative:** the recognized origin of the fact, not a re-reporter or aggregator that could disagree with the origin;
- **Public:** readable at resolution time without a paywall or login, or explicitly marked as not publicly accessible;
- **Independent:** not influenceable by a market participant;
- **Scheduled:** published on a known cadence so later timing can be anchored to it; and
- **Specific:** linked to the exact series or dataset, not merely a homepage. Include the publisher's `datasetId` when one exists.

Prefer one primary source. Add a lower-ranked fallback only for a concrete failure mode, such as the primary becoming unavailable or stopping publication. Never use a vague “or similar” fallback.

## Constraints

- Every fact the question turns on must be covered by one or more sources' `controlsFor` fields.
- Ranks must be unique and start at 1; rank 1 is the primary source that binds first.
- Give each source a stable, unique `id` slug.
- Do not invent URLs or dataset identifiers. If the exact locator is uncertain, ask the user rather than guessing.
- Do not specify how a settlement value is calculated from a source.
- Do not specify deadlines, observation windows, or resolution periods; those are later steps.

## Two-turn workflow

Work out the full records internally, but reveal the hierarchy in two turns. The MCP tools own the visible Markdown in both turns; present each returned result verbatim.

### Turn 1: propose the hierarchy

Call `propose_resolution_sources` with:

- `unit_number`: the selected unit's 1-based number;
- `selected_unit`: the exact selected unit;
- `sources`: a ranked names-only array containing only `rank`, `name`, and `publisher`; and
- `followUp`: one sentence asking whether the hierarchy is correct or should be changed, for example: “Does this source hierarchy look right, or should we add, remove, or reorder any source?”

Present the returned Markdown verbatim, then stop. Do not call `submit_resolution_source` in Turn 1.

If the user requests changes, revise the names-only proposal and call `propose_resolution_sources` again. Do not advance to Turn 2 until the user approves the hierarchy.

### Turn 2: detail and register

Only after the user approves the hierarchy, call `submit_resolution_source` with:

- `unit_number` and `selected_unit` unchanged from Turn 1;
- `sources`: the complete ranked records; and
- `followUp`: one sentence asking whether the detailed sources are correct or should be changed.

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

`submit_resolution_source` performs an advisory reachability check on every URL and renders the result with the source detail. Present that returned Markdown verbatim. If any link is unreachable or errored, surface the warning and correct the URL before locking in the hierarchy; the check itself does not block submission.

## Stop rules

- If the selected unit, unit number, or agreed definitions are missing, stop and request them.
- If the user has not approved the names-only hierarchy, do not call `submit_resolution_source`.
- If the exact URL or dataset identifier cannot be established, do not guess; ask the user or leave the source unresolved.
- If a source cannot cover a fact the unit resolves on, revise the hierarchy rather than submitting an incomplete source set.
- Do not move into settlement calculation or timing in this step.
