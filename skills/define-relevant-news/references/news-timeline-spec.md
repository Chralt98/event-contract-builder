# Optional recent-news timeline specification

Use this reference only after the user opts into recent-news research following
approval of the forecast specification's historical background information.

## Scope and relevance

Research current, recent developments that materially relate to the exact
selected forecast unit or its approved resolution criteria. Begin with the
latest developments. Extend the search farther back only when an older
development is still materially relevant or needed to explain a continuing
update. Do not impose an arbitrary news count or include items merely because
they mention the topic.

Prefer an original official announcement, filing, data release, or record when
it directly establishes the development. Use reputable reporting where it
provides relevant facts or context unavailable from a concise primary source.
Open the source page and verify what it says. Search-result snippets are leads,
not evidence. Use the direct URL to the cited item, not a search-results page,
tracking link, or guessed future URL.

## Incremental facts and concise summaries

The historical background is the starting point for what the reader already
knows. News summaries are incremental updates, not article abstracts:

1. Collect candidate developments with their source publication dates.
2. Compare them against the approved background and one another in chronological
   order from oldest to newest.
3. For each development, identify only the factual information not already
   covered by the background or any older news item.
4. Omit a candidate that adds no material new fact. If a report largely repeats
   older information, retain only its distinct update.
5. Order the resulting timeline from newest to oldest.

Use one or two short sentences per item. Include the smallest factual anchor
needed to make the update understandable, but do not repeat historical context.
State what the cited source reports. Do not infer significance, causation,
future outcomes, or probabilities. If sources disagree, describe the reports
and attribution accurately rather than presenting a disputed claim as settled.

Include at most twelve timeline items. Keep only developments that are highly
relevant to the selected forecast specification.

## Item fields and ordering

Each item contains:

- `unit_number`: unique positive integer displayed as the news-item unit number
  the user can select;
- `published_at`: verified publication date as `YYYY-MM-DD`; include a verified
  time as an ISO 8601 timestamp with its UTC offset when the source makes it
  available;
- `publisher`: the outlet or organization that published the cited item;
- `url`: direct public URL to that source;
- `summary`: succinct objective factual information that adds something new
  beyond the approved background and every older news item.

Use publication time, not an updated-at time, unless the source clearly
identifies the update as the relevant new publication. If the source shows only
a date, use the date alone. Never fabricate a time or timezone. Sort items by
publication date and, when both are known, by publication time, newest first.
Each number must be unique. When presenting a user-selected subset, preserve
the original numbers so the user can verify their selection.

## Payload and review

```text
forecast_specification_id?: UUID
unit_number: integer
selected_unit: exact display-question unit
news_timeline:
  items:
    - unit_number: unique news-item number
      published_at: verified date or date-time
      publisher: source publisher
      url: direct public source URL
      summary: succinct, new factual information
followUp: ask which news-item unit numbers are relevant, or what should change
```

The top-level `unit_number` identifies the selected forecast specification.
The nested item `unit_number` values identify news items. Do not mix them up.
Carry the immutable `language_code` through the workflow; all specification
content and follow-ups use that language.

The first submission presents candidate items for selection and is pending.
Show its complete rendered timeline and follow-up together in the same final
user-visible response. Never replace the rendered items with a summary or an
approval prompt alone. When the user selects news-item numbers, resubmit only
those items in the same order, preserving their original numbers. Show the
complete filtered timeline returned by the tool, then ask the user to approve
that exact timeline. If they request changes, revise, resubmit, and display the
complete timeline again. Only after they explicitly approve the exact timeline
that was fully visible in the immediately preceding assistant response call
`approve_forecast_specification` with `stage: "news_timeline"`.

If research finds no qualifying items, or the user selects none, do not submit
or approve an empty timeline. Leave the approved background information as the
last saved content and finish without a news section. Show only the standard
YAML, JSON, Markdown, and PDF output options.

If the user later requests removal of all items from an already approved
timeline, submit an empty `items` array and ask whether they explicitly approve
its removal. Only after approval call `approve_forecast_specification` with
`stage: "news_timeline"`. Recall omits an approved empty timeline, leaving the
historical background intact.

The news timeline is optional, non-binding context. It must not add, replace,
or reorder the approved resolution sources or modify any upstream forecast
specification stage.

After final timeline approval, do not display the internal forecast
specification ID, language code, structured approval payload, or repeated
forecast question. Show only the four standard output options: YAML in chat and
as a download, JSON in chat and as a download, Markdown in chat and as a
download, and PDF as a download. The user may choose one or several option
numbers. Retrieve the Forecast Specification only after the user chooses
formats, strip internal metadata from the result, and show YAML, JSON, and
Markdown in labeled fenced code blocks with a download link for each file.
