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
3. Construct and validate the criteria. Prepare Criteria and propose the
   complete text with current bindings; present it in chat and handle revisions
   and exact approval under the server-wide
   [workflow](../../src/foresight/instructions.md#workflow-state).
4. Apply the reference's post-approval question alignment check before asking
   separately whether to continue.

Do not modify the forecast question unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
