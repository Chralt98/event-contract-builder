---
name: define-resolution-criteria
description: Define source-grounded resolution criteria for the question represented by a selected forecast specification after its resolution sources are approved.
---

# Define resolution criteria

Read [references/criteria-spec.md](references/criteria-spec.md) before asking
questions or drafting criteria. It contains the adapted Grilling interview,
coverage rules, payload semantics, rendering, and retry behavior. The adaptation
is attributed in [THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md).

1. Require one exact selected unit with approved definitions and sources.
2. Complete every frontier round in the reference before drafting. Each round
   is the final user-visible response for that turn.
3. Once all decisions are settled, construct the criteria and call
   `submit_resolution_criteria` once. Do not show a pre-submission draft.
4. Present the rendered submission as the single criteria review. After
   explicit approval, approve `resolution_criteria` and continue with
   `define-background-information`.

Do not modify the selected unit, definitions, or source hierarchy. Follow the
server-wide language, metadata, rendering, and approval rules.
