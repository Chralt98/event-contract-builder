---
name: define-background-information
description: Research and draft neutral context and background information for a forecast specification.
---

# Define background information

Read
[references/background-information-spec.md](references/background-information-spec.md)
for the content and source standard.

1. Require one exact forecast question unit with approved resolution criteria.
   Use supplied handoff context and do not call Bleavit Foresight MCP tools or
   open its App while researching and drafting.
2. Before researching, use `request_user_input_async` for material choices
   about desired background scope, focus, audience, or requested inclusions and
   exclusions. Offer a neutral general-context recommendation and allow a
   free-form answer; do not force questions when the intent is already clear.
3. Research durable explanatory context and draft the complete background
   payload without changing any approved stage.
4. Show the complete proposed background in text chat and ask for approval or
   requested edits in one ordinary chat reply. Do not use a choice selector for
   this approval gate. Revise directly from any changes the user describes;
   only ask a follow-up when a material detail is missing. After the user
   approves the exact text for entry, call `submit_background_information`
   once and follow the server-wide
   [transfer and approval routing](../../src/foresight/instructions.md#workflow-state).
5. After the approved background appears in the App, ask whether to continue
   to optional News and research it, or skip News. This is the next-stage
   decision and, when no choice is saved, the News opt-in; save it with
   `set_forecast_news_choice` and do not ask for opt-in again. Run
   `define-relevant-news` only after `opted_in` is saved.

Follow the server-wide language, metadata, rendering, export, and approval
rules.
