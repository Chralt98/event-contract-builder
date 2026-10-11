---
name: define-resolution-criteria
description: Define source-grounded resolution criteria for the question represented by a selected forecast specification after its resolution sources are approved.
---

# Define resolution criteria

Read [references/criteria-spec.md](references/criteria-spec.md) before asking
questions or drafting criteria. It contains criteria coverage, chat interview,
payload, rendering, and retry rules. The Grilling adaptation is attributed in
[THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md).
Before submission, read and apply
[references/criteria-validation.md](references/criteria-validation.md) to the
single complete Resolution Criteria text.

1. Require one exact selected unit with approved definitions and sources.
2. On first entry from Sources, keep the Criteria App closed while conducting
   the chat interview. Follow the [criteria interview](references/criteria-spec.md#chat-interview)
   and use the Grill Me skill for each round. Do not fetch or open the Criteria
   workspace during these rounds.
3. Once all decisions are settled, construct and validate the criteria, then
   call `submit_resolution_criteria` once. The response opens the single
   editable criteria field for review. Resolve any missing material choice in
   chat before drafting; do not show a separate pre-submission draft.
4. For a later criteria interview or edit, wait for the user to ask in chat.
   Read the current saved criteria and revision, then use the same Grill Me
   interview to check whether the text matches the user's intent and gather
   additional information. Submit settled changes as a revision-bound proposal
   for review; do not trigger this workflow from an App suggestion action.
5. Use the submission response according to the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
   After initial explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state) and
   apply the reference's post-approval question alignment check before
   progressing.

Do not modify the selected unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
