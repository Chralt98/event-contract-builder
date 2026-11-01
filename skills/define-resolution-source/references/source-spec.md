# Resolution-source specification

Given a forecast question and its approved definitions, cover every fact needed to
resolve it with a fixed ranked hierarchy. Find sources suited to the display question
and intent rather than routinely rewriting the question to
match a convenient dataset. Its short wording need not state the complete
measurement rule; the criteria stage makes that rule precise against the
approved sources. Prefer public sources. When none can resolve the intended
outcome, a user may choose an authorized private source, such as personal,
employer, or customer records. Ask for enough information to identify who
maintains the data, who can access and verify it, what exact facts it contains,
and how those facts will be retrieved consistently. Do not claim to access or
verify private data that the user has not provided. If neither a suitable public
source nor an identified private source can resolve the intended outcome,
report the coverage gap without silently substituting a different event or
proxy.

For a conditional forecast question, submit one hierarchy for the outcome and a separate
`condition_sources` hierarchy for determining whether the prerequisite held.
Each hierarchy must cover its own facts and have an authoritative primary and,
when available, a useful fallback. Prefer an independent fallback when one is
available, but a dependent fallback may still help with technical availability.
Source coverage for the outcome does not establish the condition.

## Source standard

For public sources, prefer a rank-1 origin of the fact and a rank-2 fallback
independently produced by a different source agency when one is available.
Public sources must be authoritative for their stated role, accessible without
a login or paywall, independent of forecast participants, timely for the
question, and fit for the required fact. A fallback does not have to be
independent to be useful: a mirror or republication can keep the same data
available when the primary site has a technical outage. Record that it relies
on an earlier source, and do not present it as independent corroboration.

A private source may be used when the user chooses it and has authorized access
to the relevant data. Identify it in the chat as private, name its custodian
or system, and establish who can retrieve and verify it at resolution time. In
the source hierarchy, enter its name and leave the URL list empty when it has
no stable URL; the source record has no public/private flag. When
the source is controlled by a forecast participant, disclose that dependence
and prefer an independent verifier or audit trail when available. If no
independent check exists, make that limitation clear and confirm that the user
still wants to use the private source. Never imply the model has access to a
private account, database, or file unless it was provided through an available
authorized connection.

Ranks are unique and contiguous. Add further sources only for a concrete
failure mode or an approved multi-source definition. A second page, dataset,
mirror, republication, or alias of one agency is not independent evidence, but
it can be a dependent fallback when it provides another technically accessible
way to retrieve the same data. Keep data independence distinct from technical
availability in the hierarchy and in the criteria.

When variables are present, each required hierarchy must cover every allowed
value and meaningful combination. Never create value-specific source mappings.
If the shared hierarchy fails, record the gap and return to drafting to
find a forecast question unit that fits the source.

## Source identity and locator policy

Use one `name` for the organization, account, feed, private dataset, or
composite calculation responsible for the source. For social accounts, include
the platform so the account is distinguishable. Use `urls` for the direct
locators that support one hierarchy entry; leave it empty when the source has
no stable URL. Do not invent URLs or include credentials, access tokens, or
session-specific links. Discuss whether a fallback independently gathers,
mirrors, republishes, or derives data in chat and resolution criteria when that
distinction matters; the source record does not store that classification.

A fallback may rely on any earlier source or combination of sources, including
another fallback. A mirror can provide a technical access path without adding
independent corroboration. State any formula and each input's role in
resolution criteria for a composite calculation. Ranks identify the order in
which sources are tried, not whether they provide independent evidence. A
hierarchy may contain only the primary when no useful fallback is available.

One source may need multiple URLs when a calculation combines several data
series or pages. Keep those locators together on that source entry and state
the formula and each input's role in the later resolution criteria. Multiple
URLs are locators for one hierarchy entry; they do not create additional ranks.

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

Before building the final hierarchy, use `request_user_input_async` when a
material user decision remains, such as choosing between defensible source
methods or identifying an authorized private dataset. Present a public-source
recommendation when it is feasible; include an explicit public-source choice
and allow a free-form answer. Resolve those choices before drafting.

If no independent fallback exists, include a suitable mirror or other fallback
when it offers a real technical access path. If no useful fallback exists,
submit the best authoritative primary source available. Show the complete
proposed hierarchy in text chat and ask whether the user approves it or wants
changes. Iterate in chat after each change. Only after the user confirms
approval of the exact hierarchy for entry, submit it; the server-wide
workflow records that approval and opens Bleavit Foresight with the approved
hierarchy for review.
