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
2. Draft the selected term definitions in chat. Prepare Terms and submit the
   complete revision-bound proposal using the current stage bindings.
3. Present the exact proposal, handle requested revisions, and follow the
   server-wide [approval routing](../../src/foresight/instructions.md#workflow-state).
4. Run any required post-approval review against the exact approved revision,
   then follow the server-wide continuation routing before
   `define-resolution-source`.

Follow the server-wide language, metadata, rendering,
record, and approval rules.
