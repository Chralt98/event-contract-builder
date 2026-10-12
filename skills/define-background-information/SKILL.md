---
name: define-background-information
description: Research and draft neutral context and background information for a forecast specification after its resolution criteria are approved.
---

# Define background information

Read
[references/background-information-spec.md](references/background-information-spec.md)
for the content and source standard.

1. Require one exact forecast question unit with approved resolution criteria.
2. Research durable explanatory context and draft the complete background
   payload without changing any approved stage.
3. Call `submit_background_information` once and follow the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
   Resubmit the complete payload after requested changes.
4. After explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state) to
   advance to News. Collect the optional News choice before opening Completion;
   run `define-relevant-news` only after the App saves `opted_in`.

Follow the server-wide language, metadata, rendering, export, and approval
rules.
