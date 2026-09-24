# Resolution-source specification

Given one exact unit and its approved definitions, cover every fact needed to
resolve it with a fixed ranked hierarchy.

## Source standard

Prefer a rank-1 origin of the fact and a rank-2 fallback independently produced
by a different source agency. Sources must be authoritative, public without a
login or paywall, independent of forecast participants, timely for the
question, and fit for the required fact. Ranks are unique and contiguous. Add
further sources only for a concrete failure mode or an approved multi-source
definition. A second page, dataset, mirror, republication, or alias of one
agency is not an independent fallback.

When variables are present, one identical hierarchy must cover every allowed
value and meaningful combination. Never create value-specific source mappings.
If the shared hierarchy fails, record the gap and return to drafting to split
the unit.

## Source identity and locator policy

Identify each source specifically by its `name` and `publisher`. This can be a
web page, a social media account, a named feed, or another traceable source.
Include `url` when the source has a direct public web address; omit it when the
source is identified by an account handle or another non-URL identity. Do not
invent a URL for sources that do not have one.

For web-addressable sources, use the public place where that publisher is
reasonably expected to publish the future fact, not proof that the fact already
exists. Choose in this order:

1. A durable event-specific or recurring results page explicitly intended for
   the relevant result.
2. Otherwise, the entity's canonical legal gazette, results or legislation
   search, data portal, registry, or announcement/newsroom hub.
3. A historical release, methodology page, FAQ, documentation, debate page,
   or topic article is supporting evidence only unless it is itself the
   durable publication channel.

Ask for every locator: would this publisher publish the exact future fact here?
If not, find the canonical hub or report a gap. Do not use another event's
page, a guessed future path, session URL, tracking URL, or inaccessible page.
Recurring data needs a compatible cadence; event-driven outcomes need an
identifiable official announcement channel.

## Gaps and alternatives

List any required fact without authoritative primary coverage in
`coverage_gaps`; never imply full coverage. If no independent fallback exists,
a single primary is allowed only after the user accepts the rendered warning.
The follow-up must offer: proceed with one source, provide a fallback for
evaluation, or choose a nearby/proxy alternative with at least two independent
agencies. Include that alternative when appropriate without rewriting the
selected unit.
