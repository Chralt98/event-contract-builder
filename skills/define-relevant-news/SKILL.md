---
name: define-relevant-news
description: Research and review an optional, succinct timeline of recent news relevant to an approved forecast specification, only after the user explicitly opts in.
---

# Define relevant news

Read [references/news-timeline-spec.md](references/news-timeline-spec.md) before
research. It is the sole source for relevance, freshness, incremental facts,
selection, removal, and approval rules.

1. Require explicit opt-in after background approval.
2. Research original sources, build the qualified timeline, and call
   `submit_news_timeline` with the candidates.
3. Treat the user's item numbers as selection, resubmit that exact subset, and
   show it in full. Approve `news_timeline` only after the user approves the
   fully visible selected timeline.
4. If nothing qualifies or nothing is selected, keep the background-only
   record and show the server-defined export menu.

Follow the server-wide language, metadata, rendering, export, and approval
rules. News is non-binding and must not alter any approved upstream stage.
