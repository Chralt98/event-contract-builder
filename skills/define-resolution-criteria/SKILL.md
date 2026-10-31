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
2. On first entry from Sources, do not call Bleavit Foresight MCP tools or
   open the Criteria App while conducting the chat interview. Follow the
   [criteria interview](references/criteria-spec.md#chat-interview), using
   `request_user_input_async` for each round of material user decisions.
3. Once decisions are settled, construct and validate the criteria, show the
   complete proposal in text chat, and ask whether the user is satisfied or
   wants changes. Revise in chat and ask again after each revision. Only when
   the user confirms satisfaction with the exact text for entry, submit it
   once. Use `submit_resolution_criteria` when it is in the live tool catalog;
   otherwise follow the server-wide
   [fallback](../../src/foresight/instructions.md#workflow-state). Resolve any
   missing material choice in chat before drafting. The App is the final
   review after the chat-approved text has been submitted.
4. For a later criteria interview or edit, wait for the user to ask in chat.
   Read the current saved criteria and revision, then use the same interview
   and iterative chat proposal. Get explicit satisfaction with the exact
   revised text before submitting it as a revision-bound proposal; do not
   trigger this workflow from an App suggestion action.
5. Use the submission response according to the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
   Follow the server-wide
   [transfer, approval, and continuation routing](../../src/foresight/instructions.md#workflow-state).
   Apply the reference's post-approval question alignment check before asking
   whether to continue.

Do not modify the forecast question unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
