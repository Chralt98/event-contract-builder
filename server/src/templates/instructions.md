# Event Contract Builder MCP server

The packaged skills provide the semantic workflow for building prediction-market event contracts. This server provides deterministic validation, rendering, and source-link checks for the structured outputs produced by those skills.

## Workflow

1. Use `draft-display-question` to turn a sufficiently specific future event into selectable display-question units. When related concrete questions form a reusable family, retain them and append the additional template unit defined by the skill. Then call `submit_drafted_questions` and present its returned Markdown verbatim.
2. When the user selects a unit, use `define-terms` to propose precise definitions, then call `submit_defined_terms` and present its returned Markdown verbatim.
3. After the user agrees to the definitions, use `define-resolution-source` to propose a ranked source hierarchy. First call `propose_resolution_sources` with names and publishers only; after approval, call `submit_resolution_source` with the full source records and present its returned Markdown verbatim.
4. If the input lacks a specific event, threshold, or time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates and renders selectable binary, scalar, categorical, and template question units.
- `submit_defined_terms` validates and renders the selected unit with its definitions.
- `propose_resolution_sources` validates and renders a names-only ranked source proposal.
- `submit_resolution_source` validates and renders full source details and performs advisory URL reachability checks.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
