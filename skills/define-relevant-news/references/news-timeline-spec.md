# Optional recent-news timeline specification

Use only after explicit opt-in following background approval.

## Research and selection

Research recent developments materially related to the exact unit or criteria.
Open original pages; search snippets are leads, not evidence. Prefer official
announcements, filings, releases, or records, and use reputable reporting when
it adds facts or context. Cite the direct public item URL.

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

First submit all qualifying candidates and show the complete rendered timeline
and follow-up together. Ask which item numbers are relevant or need changes;
this is selection, not approval. Resubmit only the selected items in their
existing newest-first order, show the complete filtered timeline, and ask for
approval. Approve only the exact timeline fully visible in the immediately
preceding response.

If no item qualifies or the user selects none, do not submit or approve an
empty timeline; retain the background-only specification. An empty `items`
array is reserved for a user-requested removal of an already approved timeline
and itself requires review and approval.

News is optional, explanatory, and non-binding. It never changes approved
questions, definitions, sources, criteria, or background.
