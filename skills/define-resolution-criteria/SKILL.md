---
name: define-resolution-criteria
description: Define source-grounded resolution criteria for the question represented by a selected forecast specification after its resolution sources are approved.
---

# Define resolution criteria

Read [references/criteria-spec.md](references/criteria-spec.md) before asking
questions or drafting criteria. It contains the adapted Grilling interview,
coverage rules, payload semantics, rendering, and retry behavior. The adaptation
is attributed in [THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md).
Before submission, read and apply
[references/criteria-validation.md](references/criteria-validation.md) to the
single complete Resolution Criteria text.

1. Require one exact selected unit with approved definitions and sources.
2. On entry from Sources, use `next_stage_bindings` from the Continue result to
   publish the interview round directly. If that result has no target bindings,
   fetch `resolution_criteria` once and use its response. Do not reopen Sources
   or Question. Complete the App interview described in the reference before
   drafting.
   Publish one question per screen and keep interview questions out of chat.
   Treat an answer sent by the App through host messaging as the answer to its
   referenced question.
3. Once all decisions are settled, construct and validate the criteria, then
   call `submit_resolution_criteria` once. Resolve any missing material choice
   in the interview first. Do not show a pre-submission draft.
4. Use the submission response according to the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
   After explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state),
   apply the reference's post-approval question alignment check, and continue
   with `define-background-information`.

Do not modify the selected unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
