# Optional recent-news timeline specification

Initial news research requires explicit opt-in following background approval.
During impact review, reuse this specification's saved choice without asking
again: `opted_in` and `unavailable` preserve research permission, while
`declined` and `undecided` mean skip News for that review. When saved opted-in
News is eligible for review, check current sources and developments against the
latest approved prerequisites. If the existing timeline remains valid and
unchanged, revalidate it; otherwise submit an updated proposal and leave it
unapproved. Never replace `declined` with a new choice or treat changed
prerequisites as revoked consent. A user can explicitly change their choice.

Removing an already approved timeline is a separate user-requested operation
and does not require opt-in or research: set the current News choice to Skip,
review the resulting empty draft in the MCP App, and wait for approval. Keep
the approved timeline intact until that empty draft is approved.

## Research and selection

Research recent developments materially related to the exact forecast question unit or criteria.
Open original pages; search snippets are leads, not evidence. Prefer official
announcements, filings, releases, or records, and use reputable reporting when
it adds facts or context. Cite the direct public item URL.

Start with one batched search of up to four distinct, targeted queries, then
open the strongest original sources together. Search again only to close a
specific evidence gap or verify a candidate that could change the timeline;
do not repeat the same coverage with site or date variations.

Treat the approved background as already known. Compare candidates oldest to
newest, retain only each item's distinct factual update, omit repetitions, then
display at most twelve highly relevant items newest first. Do not pad the list.
Use one or two neutral sentences; do not infer significance, causation,
probabilities, or likely outcomes. Attribute disputed reports accurately.

Each item has a unique positive `unit_number`, `publisher`, direct `url`,
succinct incremental `summary`, and verified `published_at`. Use `YYYY-MM-DD`
when only the date is known; include an ISO 8601 time and offset only when the
source verifies them. Never infer time from search metadata or confuse an
update timestamp with publication. Preserve original item numbers in a
selected subset.

## Review and approval

First submit all qualifying candidates and show the complete timeline and
follow-up in the MCP App. Ask which item numbers are relevant or need changes;
this is selection, not approval. Since the timeline is fully visible in the
App, do not repeat item summaries, publishers, sources, or dates in chat. If
the user keeps all displayed items without changes (for example, “all keep”),
the displayed proposal is already the exact selected timeline: treat that
response as approval without resubmitting or asking for approval again. For a
subset or edited timeline, resubmit only the selected items in their existing
order, show the complete filtered timeline in the App, and ask for
approval without restating its details in chat. After approval, follow the server-wide
[approval routing](../../../src/foresight/instructions.md#workflow-state) to
approve and complete the workflow. Keep any chat response to useful context not
already shown in the App and the next action; do not summarize the approved
timeline there.

If no item qualifies or the user selects none, do not submit or approve an
empty timeline; retain the background-only specification. An empty `items`
array is reserved for a user-requested removal of an already approved timeline
and itself requires review and approval.

News is optional, explanatory, and non-binding. It never changes approved
questions, definitions, sources, criteria, or background.
