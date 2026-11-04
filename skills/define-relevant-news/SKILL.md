---
name: define-relevant-news
description: Research and review an optional, succinct timeline of recent news relevant to a forecast specification, only after the user explicitly opts in.
---

# Define relevant news

Read [references/news-timeline-spec.md](references/news-timeline-spec.md) before
research. It is the sole source for relevance, freshness, incremental facts,
selection, removal, and approval rules.

1. Ask for the initial opt-in after background approval using
   `request_user_input_async` only when this specification has no saved News
   choice and the Background-stage transition did not already collect it.
   Reuse a choice already saved during that transition. During impact review, reuse the
   saved choice as described in the reference. For a user-requested removal of
   an approved timeline, do not research or require opt-in: set News to Skip if
   needed, then review and approve the empty draft.
2. Research original sources and build the qualified timeline in chat without
   calling Bleavit Foresight MCP tools or opening the News App. Present each
   candidate as a complete timeline entry, then use
   `request_user_input_async` for material selection choices. Follow the
   reference's approval rule so an unchanged selection is not approved twice.
   If nothing qualifies or the user selects none, do not submit.
3. Prepare News and propose the selected complete timeline with current
   bindings. Present it in chat and follow the server-wide
   [proposal and approval routing](../../src/foresight/instructions.md#workflow-state).
   Then ask whether the user wants to finish and open Export.
4. If nothing qualifies or nothing is selected, keep the background-only
   record and show the server-defined export menu.

Follow the server-wide language, metadata, rendering, export, and approval
rules. News is non-binding and must not alter any approved upstream stage.
