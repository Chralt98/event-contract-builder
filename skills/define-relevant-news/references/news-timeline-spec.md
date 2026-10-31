# Optional recent-news timeline specification

Initial news research requires explicit opt-in following background approval;
collect the opt-in with `request_user_input_async` when no choice is saved.
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
show the empty timeline in chat, and get the user's approval before submitting
it. Keep the approved timeline intact until the empty timeline is saved and
approved by the server-wide workflow.

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

Present all qualifying candidates in chat first. Use
`request_user_input_async` when the user must choose which candidates to keep,
revise, or omit. Show every candidate as its complete timeline entry, including
publication date, publisher, summary, and direct source URL, so the user can
make an informed selection. A selection of numbered entries approves the
resulting timeline when it only includes or omits those exact entries; do not
repeat that selection as a second approval question. If the user requests an
edit or the selected content is materially revised, show the complete revised
timeline and ask once whether it is approved. Submit only after the applicable
selection or approval. The server-wide workflow records chat approval and opens
Bleavit Foresight with the approved timeline for review.
Then ask whether the user wants to finish and open Export. Keep any chat
response to useful context not already shown in the App and the next action;
do not summarize the approved timeline there.

If no item qualifies or the user selects none, do not submit or approve an
empty timeline; retain the background-only specification. An empty `items`
array is reserved for a user-requested removal of an already approved timeline
and must follow the same chat-approval and server-wide submission routing.

News is optional, explanatory, and non-binding. It never changes approved
questions, definitions, sources, criteria, or background.
