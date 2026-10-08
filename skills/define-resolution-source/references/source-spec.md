# Resolution-source specification

Given one exact unit and its approved definitions, cover every fact needed to
resolve it with a fixed ranked hierarchy. Find sources suited to the selected
display question and intent rather than routinely rewriting the question to
match a convenient dataset. Its short wording need not state the complete
measurement rule; the criteria stage makes that rule precise against the
approved sources. Report a genuine coverage gap when no suitable source exists,
without silently substituting a different event or proxy.

For a conditional unit, submit one hierarchy for the outcome and a separate
`condition_sources` hierarchy for determining whether the prerequisite held.
Each hierarchy must cover its own facts and have an independent primary and,
when available, fallback. Source coverage for the outcome does not establish
the condition.

## Source standard

Prefer a rank-1 origin of the fact and a rank-2 fallback independently produced
by a different source agency. Sources must be authoritative, public without a
login or paywall, independent of forecast participants, timely for the
question, and fit for the required fact. Ranks are unique and contiguous. Add
further sources only for a concrete failure mode or an approved multi-source
definition. A second page, dataset, mirror, republication, or alias of one
agency is not an independent fallback.

When variables are present, each required hierarchy must cover every allowed
value and meaningful combination. Never create value-specific source mappings.
If the shared hierarchy fails, record the gap and return to drafting to split
the unit.

## Source identity and locator policy

Use one `name` for the organization, account, or feed responsible for the
source. For social accounts, include the platform so the account is
distinguishable. Use a distinct source name for an independent fallback. A
different page, dataset, mirror, or republication from the same organization or
account is not independent. Use `url` to locate the specific public results
page, feed, or data series; omit it when the source is identified by a non-URL
identity. Do not invent a URL for sources that do not have one.

For web-addressable sources, use the public place where that organization or
account is reasonably expected to publish the future fact, not proof that the
fact already exists. Choose in this order:

1. A durable event-specific or recurring results page explicitly intended for
   the relevant result.
2. Otherwise, the entity's canonical legal gazette, results or legislation
   search, data portal, registry, or announcement/newsroom hub.
3. A historical release, methodology page, FAQ, documentation, debate page,
   or topic article is supporting evidence only unless it is itself the
   durable publication channel.

Ask for every locator: would this source publish the exact future fact here?
If not, find the canonical hub or report a gap. Do not use another event's
page, a guessed future path, session URL, tracking URL, or inaccessible page.
Recurring data needs a compatible cadence; event-driven outcomes need an
identifiable official announcement channel.

If no independent fallback exists, submit the best authoritative primary
source available. The follow-up remains limited to approving or revising the
source hierarchy.
