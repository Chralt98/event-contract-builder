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
4. Show the proposed complete hierarchy in text chat, including names, URLs
   (or private sources with no URL), priorities, and any condition sources.
   Follow the server-wide
   [turn-completion rule](../../src/foresight/instructions.md#workflow-state)
   when presenting the proposal and waiting for the user's response. Only after
   the user explicitly approves the exact hierarchy for entry, submit
   it once. Use `submit_resolution_source` when it is in the live tool catalog;
   otherwise follow the server-wide
   [fallback](../../src/foresight/instructions.md#workflow-state).
5. For later user-requested edits, likewise settle and approve the complete
   revised hierarchy in chat before using MCP tools. If the user asks for an
   AI review, submit the full
   suggested hierarchy using the current revision bindings, following the
   server-wide fallback when the stage-specific tool is absent. After explicit
   approval, follow the server-wide
   [transfer, approval, and continuation routing](../../src/foresight/instructions.md#workflow-state)
   to `define-resolution-criteria`.

Follow the server-wide rules for language, internal metadata, rendering,
separate alternative records, and approvals.
