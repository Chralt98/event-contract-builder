---
name: define-resolution-criteria
description: Define source-grounded resolution criteria for the question represented by a forecast specification.
---

# Define resolution criteria

Read [references/criteria-spec.md](references/criteria-spec.md) before asking
questions or drafting criteria. It contains criteria coverage, interview,
payload, rendering, and retry rules.
Before submission, read and apply
[references/criteria-validation.md](references/criteria-validation.md) to the
single complete Resolution Criteria text.

1. Require one exact forecast question unit with approved definitions and sources.
2. On first entry from Sources, keep the Criteria App closed while conducting
   the chat interview. Follow the [criteria interview](references/criteria-spec.md#chat-interview)
   and use `request_user_input_async` for each round. Do not fetch or open the
   Criteria workspace during these rounds.
3. Once all decisions are settled, construct and validate the criteria, then
   submit it once. Use `submit_resolution_criteria` when it is in the live tool
   catalog; otherwise follow the server-wide
   [fallback](../../src/foresight/instructions.md#workflow-state). Resolve any
   missing material choice in chat before drafting; do not show a separate
   pre-submission draft.
4. For a later criteria interview or edit, wait for the user to ask in chat.
   Read the current saved criteria and revision, then use the same iterative
   in-chat interview to check whether the text matches the user's intent and
   gather additional information. Submit settled changes as a revision-bound
   proposal for review, following the server-wide fallback when the
   stage-specific tool is absent; do not trigger this workflow from an App
   suggestion action.
5. Use the submission response according to the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
   After initial explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state) and
   apply the reference's post-approval question alignment check before
   progressing.

Do not modify the forecast question unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
