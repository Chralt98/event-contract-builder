---
name: define-resolution-source
description: Identify and register independent authoritative resolution sources for a selected forecast specification unit after its terms are agreed.
---

# Define resolution sources

Read [references/source-spec.md](references/source-spec.md) before research. It
is the sole source for coverage, independence, variable-value, locator, and
fallback rules.

1. Require one exact selected unit with approved definitions.
2. Research the complete hierarchy, preferring two independent sources when
   available.
3. Finish research before calling `submit_resolution_source`; submit the full
   hierarchy once and follow the server-wide
   [MCP App rendering rule](../../src/foresight/instructions.md#language-and-rendering).
4. If the user edits the hierarchy and asks for an AI review, submit the full
   suggested hierarchy using the current revision bindings. Only after explicit
   approval, approve `resolution_sources` and continue with
   `define-resolution-criteria`.

Follow the server-wide rules for language, internal metadata, rendering,
separate alternative records, and approvals.
