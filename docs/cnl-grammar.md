# Controlled Natural Language (CNL) Grammar — v0.1

The DSL's English layer is _controlled_: a closed vocabulary, fixed sentence
templates, and a deterministic renderer. The goal is that two careful readers
— or a reader and a settlement engine — can never disagree about what a
sentence commits the contract to.

## R1 — Closed comparator vocabulary

Every comparison uses exactly one of these phrases. Synonyms ("at least",
"exceeds", "no more than") are invalid in canonical statements.

| Comparator (machine)    | English realization                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `greater-than`          | is greater than                                                                          |
| `greater-than-or-equal` | is greater than or equal to                                                              |
| `less-than`             | is less than                                                                             |
| `less-than-or-equal`    | is less than or equal to                                                                 |
| `equal-to`              | is exactly equal to                                                                      |
| `between-inclusive`     | is greater than or equal to the lower bound and less than or equal to the upper bound of |
| `occurs`                | occurs                                                                                   |
| `does-not-occur`        | does not occur                                                                           |

## R2 — Banned lexicon (hedging)

A `CnlSentence` is rejected at parse time if it contains any of:
`approximately`, `roughly`, `about`, `around`, `reasonable`, `significant`,
`materially`, `generally`, `etc.`

Rationale: every one of these words delegates the outcome to a future
argument. If a tolerance is intended, state it numerically ("within 0.1
percentage points") instead.

## R3 — Render, don't write

The trader-facing `resolution.canonicalStatement` is produced by
`renderCanonicalStatement(spec)` from structured fields. Authors may paste
the rendered output into the YAML for readability, but validation re-renders
and rejects any divergence. Editing the sentence without editing the fields
is impossible by construction.

## Sentence templates

Placeholders in braces are filled from structured fields; `{WINDOW}` always
expands to `the period from {start} to {end} ({timezone})`.

**T1 Binary threshold**

> This contract resolves YES if {METRIC}, as published by {PUBLISHER}
> ({SOURCE}), measured over {WINDOW}, {COMPARATOR_PHRASE} {THRESHOLD} {UNIT},
> applying the {REVISION_POLICY} as of the resolution deadline; otherwise it
> resolves NO.

**T2 Binary occurrence**

> This contract resolves YES if the following event {COMPARATOR_PHRASE}
> within {WINDOW}: {EVENT_CLAUSE} Otherwise it resolves NO.

Disposition phrases (closed vocabulary):

| `ifUnmet` value                       | English realization                                           |
| ------------------------------------- | ------------------------------------------------------------- |
| `void-and-refund`                     | is voided and all positions are refunded at acquisition price |
| `resolve-no`                          | resolves NO                                                   |
| `resolve-to-floor`                    | settles at the floor value stated in section payout           |
| `exchange-determination-per-rulebook` | is resolved by exchange determination under the rulebook      |

**T3 Bucket membership (threshold-bucket ladders)**

> This contract resolves to the single bucket outcome listed in section
> payout whose range contains the value of {METRIC}, as published by
> {PUBLISHER} ({SOURCE}), measured over {WINDOW}, applying the
> {REVISION_POLICY}; bucket lower bounds are inclusive and upper bounds are
> exclusive.

The boundary convention is part of the grammar: **lower bounds inclusive,
upper bounds exclusive**, everywhere (buckets and capped-variable bands), and
ladders must tile the whole real line so "no bucket matched" is impossible by
construction.

## Free CNL sentences

Some fields (edge-case `scenario`/`disposition`, fallback `procedure`, `extraction`) are authored
sentences rather than template renders. They must still:

1. be a single declarative sentence (capitalized, period-terminated);
2. avoid the banned lexicon (R2);
3. name concrete observables — a publication, a table, a field, a timestamp —
   rather than judgments ("widely reported", "official confirmation");
4. resolve every date word against the window's stated timezone.

A useful authoring test: _could a settlement clerk with no market context
execute this sentence using only the named sources?_ If executing it requires
opinion, the sentence is not yet CNL.

## Revision-policy phrases

| Machine value                  | English realization                            |
| ------------------------------ | ---------------------------------------------- |
| `first-published-value`        | first published value                          |
| `value-as-of-observation-time` | value displayed at the stated observation time |
| `final-revised-value`          | final revised value                            |
