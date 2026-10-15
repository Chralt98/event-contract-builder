---
name: define-resolution-source
description: Identify and register independent authoritative resolution sources for a forecast specification.
---

# Define resolution sources

Read [references/source-spec.md](references/source-spec.md) before research. It
is the sole source for coverage, independence, variable-value, locator, and
fallback rules.

1. Require a forecast question with approved definitions.
2. Research the complete hierarchy, preferring at least two independent sources when
   available.
3. Finish research before submitting the full hierarchy once. Use
   `submit_resolution_source` when it is in the live tool catalog; otherwise
   follow the server-wide [fallback](../../src/foresight/instructions.md#workflow-state).
4. If the user edits the hierarchy and asks for an AI review, submit the full
   suggested hierarchy using the current revision bindings, following the
   server-wide fallback when the stage-specific tool is absent. After explicit
   approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state) and
   its returned handoff to `define-resolution-criteria`.

Follow the server-wide rules for language, internal metadata, rendering,
separate alternative records, and approvals.
