---
name: define-relevant-news
description: Research and review an optional, succinct timeline of recent news relevant to a forecast specification, only after the user explicitly opts in.
---

# Define relevant news

Read [references/news-timeline-spec.md](references/news-timeline-spec.md) before
research. It is the sole source for relevance, freshness, incremental facts,
selection, removal, and approval rules.

1. Ask for the initial opt-in after background approval only when this
   specification has no saved News choice. During impact review, reuse the
   saved choice as described in the reference. For a user-requested removal of
   an approved timeline, do not research or require opt-in: set News to Skip if
   needed, then review and approve the empty draft.
2. Research original sources, build the qualified timeline, and call
   `submit_news_timeline` with the candidates.
3. For keep-all with no changes, treat the already visible proposal as
   accepted. For a subset or edits, resubmit the exact selection, present it in
   the MCP App, and wait for approval without repeating its item details in
   chat. Then follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state) to
   approve and complete the workflow.
4. If nothing qualifies or nothing is selected, keep the background-only
   record and show the server-defined export menu.

Follow the server-wide language, metadata, rendering, export, and approval
rules. News is non-binding and must not alter any approved upstream stage.
