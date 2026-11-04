---
name: define-resolution-source
description: Identify authoritative resolution sources and record their evidence lineage for a forecast specification.
---

# Define resolution sources

Read [references/source-spec.md](references/source-spec.md) before research. It
is the sole source for coverage, lineage, variable-value, locator, and fallback
rules.

1. Require a forecast question with approved definitions. Use supplied
   handoff context; do not call Bleavit Foresight MCP tools or open its App
   while developing the source proposal in chat.
2. Research source-feasible options first. Use `request_user_input_async` for
   material choices about resolver preferences or any authorized private
   source, while recommending a public authoritative hierarchy when suitable.
   Do not treat an unidentified private source as viable.
3. Research the complete hierarchy, preferring public sources and independent
   fallbacks when available. A reliable mirror or republication can still be a
   useful technical fallback, but do not describe it as independent
   corroboration. If no public source covers
   the intent, ask whether the user wants to resolve it from private data they
   can authorize and identify; follow the source reference's private-source
   checks.
4. Prepare Sources and propose the complete hierarchy with current bindings.
   Present the exact names, URLs, priorities, and condition sources in chat.
   Handle revisions and exact approval using the server-wide
   [workflow](../../src/foresight/instructions.md#workflow-state), then follow
   separate continuation to `define-resolution-criteria`.

Follow the server-wide rules for language, internal metadata, rendering,
separate alternative records, and approvals.
