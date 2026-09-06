# Event Contract Builder MCP server

The packaged skills provide the semantic workflow for building prediction-market event contracts. This server provides deterministic validation, rendering, and advisory source-link checks for the structured outputs produced by those skills.

## Approved contract memory

The submission tools keep each validated workflow handoff in the current MCP
session: the candidate draft for handoff matching, plus the selected unit,
definitions, proposed source hierarchy, and detailed source records. Each
successful submission returns a `contract_id` in its structured content.
Preserve that identifier and pass it to the next workflow tool so multiple
contracts in one chat remain separate. HTTP sessions also publish snapshots to
a process-lifetime handoff registry, but that registry is addressable only by
an explicitly supplied `contract_id`; an omitted ID never searches it. The
identifier is a random bearer handoff, not authentication or authorization,
and all in-memory data is lost when the server process ends.

When the user asks to recall or show the saved contract, call
`get_approved_event_contract`. Omit `contract_id` to retrieve the most recently
updated record only when the call is in the same MCP session; pass the requested
identifier when the host may have opened a new HTTP session. If the user selects
a new alternative-market question, start a new record rather than carrying the
original contract ID into that branch. Recall exposes only the approved
selected unit, definitions, and source records; it does not replay the initial
candidate-question draft, workflow follow-ups, or unselected alternatives.

## Language and rendered tool output

Respond in the language of the user's latest message, or the user's most likely
language when the message is short or mixed. The deterministic tool output is
an English rendering scaffold, not a language requirement. When presenting
tool output, translate renderer-generated English labels, headings, warnings,
and other fixed UI text into that language. Preserve all user-authored and
data-bearing content exactly, including questions, definitions, source names,
publishers, URLs and Markdown link targets, variable names and values,
placeholders, dataset IDs, rank numbers, HTTP status codes, and other factual
values. Keep the same structure and include all content; do not expose the raw
structured payload.

## Workflow

1. Use `draft-display-question` to turn a sufficiently specific future event into selectable display-question units. When related concrete questions form a reusable family, retain them and append the additional template unit defined by the skill. Then call `submit_drafted_questions` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Preserve the returned `contract_id` for the selected unit's next step.
2. When the user selects a unit, use `define-terms` to propose precise definitions, pass the prior `contract_id` when one is available, then call `submit_defined_terms` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Carry the returned identifier forward.
3. After the user agrees to the definitions, use `define-resolution-source` to propose a ranked source hierarchy. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. First call `propose_resolution_sources` with the carried `contract_id`, names, publishers, and exact URLs; after approval, call `submit_resolution_source` with the same identifier and full source records and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and offer a nearby/proxy `alternative_market` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, pass its exact display-question unit as `selected_unit` with its number to `define-terms` and omit the original `contract_id` to start a new record; do not submit or reuse the original hierarchy or definitions, and re-evaluate the alternative sources after the new definitions are agreed.
4. If the input lacks a specific event, threshold, or time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates, stores, and renders selectable binary, scalar, categorical, and template question units.
- `submit_defined_terms` validates, stores, and renders the selected unit with its definitions.
- `propose_resolution_sources` validates, stores, and renders a concise ranked source proposal with clickable URLs, silently preflights every main and alternative URL and keeps only final HTTP-200 links, rejects repeated publishers/source agencies, and renders coverage warnings or a newly drafted selectable alternative display-question unit with a `define-terms` handoff when supplied. Do not expose the preflight statuses or failure details.
- `submit_resolution_source` validates, stores, and renders full user-facing source details, rejecting repeated publishers/source agencies. It still performs advisory URL checks and retains one aggregate warning for unavailable sources, while its Markdown omits transient individual statuses and the `publiclyAccessible` metadata.
- `get_approved_event_contract` retrieves the approved selected unit, definitions, and source records for one contract in the current session, or via an explicit `contract_id` handoff across HTTP sessions, and renders them together.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
