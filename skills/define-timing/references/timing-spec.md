# Timing specification

Read this reference when proposing timing for one selected and approved
prediction-market display-question unit.

## Timing concepts

Use these definitions verbatim in every timing proposal:

- **Observation window:** The bounded period from the observation start
  through the observation end during which the measurement is made. A
  point-in-time occurrence market has no observation window unless the
  question explicitly makes it one.
- **Event deadline / resolution deadline / observation end:** The binding last
  instant at which the underlying event may occur or the measurement period may
  end. The boundary rule states whether an occurrence or measurement at that
  exact instant is included.
- **Expiration datetime:** The binding instant at which the contract stops
  awaiting facts and its final Expiration Value or Market Outcome is
  determined under the contract terms. It may be later than the event deadline
  or observation end when the authoritative evidence is published afterward
  or a defined review is required.
- **Last trading time / market close:** The binding instant at which trading
  stops. It controls trading availability only; it does not decide whether the
  underlying event occurred.

Do not substitute one concept for another. In particular, an event deadline
does not automatically mean that evidence must already have been published,
and expiration does not automatically equal observation end.

## Input boundary

The input must contain:

- the exact selected binary, scalar, categorical, or template unit;
- its 1-based unit number; and
- evidence that the selected unit has been explicitly approved.

This step precedes term definition and source selection. It may use an
explicit time phrase in the display question and user-provided context, but
must not invent a missing time boundary. Definitions and sources are not
required inputs because this step determines the time boundary they must later
respect.

For a template, timing must cover the whole unit. Do not choose one variable
value or produce separate timing for individual template expansions unless the
user explicitly selected a concrete unit instead.

## Boundary analysis

### Point-in-time or occurrence event

Record one `event_deadline` instant. If the question says “by”, treat the
wording as a candidate inclusive boundary only when the surrounding context
supports that reading; otherwise ask the user to confirm. A date without a
clock time is incomplete. A local time without a named time zone is incomplete.

### Measurement

Record both `observation_start` and `observation_end`. State whether each
boundary is inclusive or exclusive; if the specification uses one common rule,
state it explicitly for both endpoints. Do not convert a measurement window
into a single deadline and lose the start.

### Occurrence versus publication control

Always ask the user to choose or correct one of these rules:

1. **Occurrence time controls:** occurrence before the event deadline or within
   the observation window is sufficient, even if qualifying evidence is
   published later.
2. **Publication time controls:** the qualifying evidence must be published by
   the event deadline or observation end; occurrence alone is insufficient.
3. **Both control:** the event must occur within the boundary and qualifying
   evidence must also be published by it.

If the user has not selected one, make a clearly labeled provisional
recommendation based on the event and the intended evidence, state the
assumption, and ask the user to confirm or correct it. Do not treat the
recommendation as approved, and do not choose based only on what a source
usually publishes.

## Timestamp and time-zone rules

Every proposed or approved datetime must include:

- a canonical UTC timestamp in ISO 8601 form
  `YYYY-MM-DDTHH:mm:ssZ`;
- a named IANA time zone such as `Europe/Berlin` or `America/New_York`; and
- enough date and clock-time information for the user to verify the schedule.

When the user gives a local time, preserve that named IANA time zone and
convert it to the canonical UTC timestamp. Do not use an ambiguous abbreviation
such as `CET`, `EST`, or `local time` as the only time-zone value. If the user
has not supplied a value, propose a clearly labeled assumption with a named
IANA time zone and exact UTC timestamp for review; do not silently guess or
approve it.

The UTC timestamp is the binding machine-readable value. The named IANA zone
is retained so the user can inspect the intended local schedule. Do not change
an approved timestamp merely to reformat it for display.

## Trading and expiration suggestions

Suggest all of these together in the same proposal:

- `trading.start`: when trading may begin;
- `trading.end`: the last trading instant, normally before the event deadline
  or observation end;
- `expiration.datetime`: when the final outcome/value is determined; and
- the IANA time zone for each schedule.

Use the available event context to choose a reasonable schedule. Always show
suggestions for trading start, trading end, and expiration, even when the user
has not supplied a product schedule. State the assumptions behind each
suggestion and ask the user to correct them. Do not present any suggested
schedule as approved.

Expiration may coincide with the observation end when the result is available
immediately. It should be later when a source is expected to publish after the
boundary or when a defined review period is needed. Source selection happens
later and must test whether its publication schedule fits the approved
expiration; it must not silently move expiration.

## Recommended proposal shape

The skill presents the conversational proposal in this shape. Show the exact
selected unit first, followed by `---`; do not use a separate Handoff section.
Use a timeline for the proposed schedule and a compact key-rules table. Include
the canonical UTC timestamp, named IANA time zone, and enough local date/time
information for every proposed datetime. After the key-rules table, include a
second `---` before the follow-up. After the user confirms the proposal, call
`submit_timing` with the carried `contract_id`, the 1-based `unit_number`, the
exact `selected_unit`, the complete timing fields, and `followUp`. The submitted
tool response echoes the same structured shape:

```text
**Selected Unit <unit number>: <binary | scalar | categorical | template>**

For a binary unit:
- <exact selected question>

For a scalar or categorical unit:
- <exact selected question 1>
- <exact selected question 2>
- <...complete selected question set...>

For a template unit:
- <exact selected template question>
  - `<template variable>`:
    - <allowed value>

---

**Timing proposal**

```text
<trading start local datetime> <IANA time zone>
UTC: <trading start UTC timestamp>
Trading opens
        │
<trading end local datetime> <IANA time zone>
UTC: <trading end UTC timestamp>
Trading closes
        │
<event deadline local datetime> <IANA time zone>
UTC: <event deadline UTC timestamp>
Event deadline
        │
<expiration or fallback milestone>
        │
<expiration local datetime> <IANA time zone>
UTC: <expiration UTC timestamp>
Contract expires
```

**Key rules**

| Item | Proposed value |
|---|---|
| Event type | <point-in-time event or measurement> |
| Observation window | <start/end with UTC timestamps, or N/A> |
| Boundary | <inclusive or exclusive> |
| Evidence rule | <occurrence time, publication time, or both> |
| Time zone | <IANA time zone> |

<Optional concise assumption or fallback note.>

---

Do you approve this complete timing, including whether occurrence time,
publication time, or both control? Would you like anything in the proposed
timing explained, or would you like to correct anything?
```

The inline definitions are fixed. Translate only the labels and fixed
explanatory UI text when the user works in another language; retain all
timestamps, time-zone identifiers, question text, and user-provided data.

## Approval and handoff

Approval must be explicit and cover the event boundary, the evidence rule,
trading start/end, and expiration datetime. If the user changes one field,
recalculate dependent suggestions where necessary and present the complete
proposal again. A response such as “looks good except expiration” is a
correction, not approval.

After the user confirms the conversational proposal, call `submit_timing` and
present its complete returned Markdown. The conversational confirmation is the
timing approval, so immediately call `approve_event_contract` with
`stage: "timing"` and the same `contract_id`; do not ask for a second timing
approval. Only after that tool succeeds, hand the exact timing object and exact
selected unit to `define-terms`. Later, hand both the approved timing and agreed
definitions to `define-resolution-source`. The source workflow must use the
approved timing when assessing publication schedules and must return here if
the hierarchy cannot settle the unit within those boundaries.
