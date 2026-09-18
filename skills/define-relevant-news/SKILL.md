---
name: define-relevant-news
description: Research and review an optional, succinct timeline of recent news relevant to an approved forecast specification, only after the user explicitly opts in.
---

# Purpose

Add an optional, source-linked view of recent developments to a forecast
specification. The existing background-information step remains historical and
durable context. Never start this news workflow automatically after background
information; wait until the user explicitly opts in.

Read [references/news-timeline-spec.md](references/news-timeline-spec.md)
before researching or submitting the timeline. It defines the freshness,
incremental-information, date, numbering, selection, payload, and approval
requirements.

## Workflow

1. Confirm the user explicitly opted in after the background-information stage
   was approved. Retrieve the approved specification by its carried
   `forecast_specification_id` when needed. Preserve its exact selected unit,
   definitions, resolution criteria, historical background, and locked
   `language_code`.
2. Use live web search and open the original source pages. Research recent
   developments that are directly relevant to the selected forecast unit and
   its resolution criteria. Prefer original official announcements or records;
   use reputable reporting when it adds material facts or context. Verify the
   publication date and time from each source when available. Do not infer a
   publication time from a search-result timestamp, page update time, or
   unrelated metadata.
3. Compare developments against the complete approved background and against
   older news. Build the facts internally from oldest to newest so that each
   candidate contributes a distinct update. If a newer article mostly repeats
   known information, extract only its new facts; omit it if it adds none.
   Then arrange retained items from newest to oldest. Include no more than
   twelve highly relevant items, and do not pad the list to reach a minimum.
4. Give each candidate a unique news-item `unit_number`, initially numbered in
   display order. For each item include the publication date, the verified
   time and offset when available, publisher, direct source URL, and a
   succinct factual summary. Use an ISO date when only the date is known and
   an ISO 8601 date-time with its offset when the time is verified. State
   reported facts neutrally; do not infer likely outcomes, probabilities, or
   what a development means for the forecast.
5. If no qualifying news is found, tell the user that no sufficiently relevant,
   new information met the standard. Do not submit an empty timeline or invent
   weakly related items. Finish with the approved background-only
   specification and offer to show it.
6. Call `submit_news_timeline` with the carried
   `forecast_specification_id`, exact selected unit and its forecast
   specification `unit_number`, the proposed `news_timeline`, and a follow-up
   asking which news-item unit numbers the user considers relevant or wants
   revised. Write every field and follow-up in the record's immutable
   `language_code`. Present the complete returned Markdown with the shared
   layout: selected forecast unit, `---`, relevant news timeline, `---`,
   follow-up. Translate renderer-generated labels and fixed UI text into the
   locked specification language.
7. Treat the user's item-number response as a selection, not as approval of the
   exact final timeline. If they select one or more items, retain only those
   items, preserve their original news-item unit numbers and newest-to-oldest
   order, and resubmit the selected timeline with a follow-up asking whether
   they approve these exact items or want changes. Resubmit the complete
   corrected timeline whenever they request edits. Only after explicit
   approval of the displayed final timeline call
   `approve_forecast_specification` with `stage: "news_timeline"`.
8. If the user selects no items from the proposed timeline, do not submit or
   approve it. Confirm that the specification will remain without news and
   offer to show the complete approved specification. If the user later asks
   to remove all items from an already approved timeline, submit an empty
   `items` array with a follow-up asking whether they explicitly approve the
   removal; call `approve_forecast_specification` with
   `stage: "news_timeline"` only after that confirmation. The approved
   background remains in place and recall omits the empty news timeline.
   After final news approval, present only the returned specification ID and
   exact forecast question, then offer to show the complete approved
   specification. Retrieve it only if the user chooses to see it.

## Guardrails

- Never begin news research without explicit user opt-in after background
  information has been approved.
- Keep the background-information stage focused on historical, institutional,
  procedural, and durable domain context. Put recent developments only in this
  separate optional workflow.
- Include a news item only when it is highly relevant and adds a sufficiently
  new factual development beyond both the background and every older item.
- Keep summaries short, factual, and objective. Avoid analysis, advocacy,
  speculation, probabilities, and repeated context.
- Use the direct source URL and publisher for every item. News references are
  informational; they never modify the binding resolution-source hierarchy.
- Keep all timeline content and workflow follow-ups in the immutable
  `language_code`.
- Do not change approved questions, definitions, sources, criteria, or
  background information while preparing news.
