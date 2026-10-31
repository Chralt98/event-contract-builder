---
name: define-terms
description: Identify genuinely ambiguous terms in a forecast specification and propose precise definitions.
---

# Define terms

Read [references/definition-spec.md](references/definition-spec.md) before
analysis. It is the sole source for ambiguity and definition rules.

1. Analyze the complete forecast specification without rewriting it. Before
   calling any Bleavit Foresight MCP tool or opening the App, use
   `request_user_input_async` to ask which genuinely ambiguous terms the user
   wants defined, offering the candidate terms, a recommended selection, and
   an explicit choice to define none. Resolve additions, omissions, or
   uncertainties through the same chat question flow.
2. Draft the selected term definitions in text chat. Ask whether the user is
   satisfied or wants changes; revise in chat and ask again after every change.
   Only after the user confirms satisfaction with the exact map for entry may
   you proceed to the Terms workspace.
3. Only after explicit chat approval, use `next_stage_bindings` from the
   approval or stage handoff when supplied; do not reopen the prior stage or
   fetch Terms again. If bindings are unavailable, fetch `defined_terms` once.
   Then call `submit_defined_terms` once and follow the server-wide
   [transfer and approval routing](../../src/foresight/instructions.md#workflow-state).
4. Run any required post-approval review against the exact approved revision,
   then follow the server-wide continuation routing before
   `define-resolution-source`.

Follow the server-wide language, metadata, rendering,
record, and approval rules.
