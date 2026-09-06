# Event Contract Builder MCP server

The packaged skills provide the semantic workflow for building prediction-market event contracts. This server provides deterministic validation, rendering, and advisory source-link checks for the structured outputs produced by those skills.

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

1. Use `draft-display-question` to turn a sufficiently specific future event into selectable display-question units. When related concrete questions form a reusable family, retain them and append the additional template unit defined by the skill. Then call `submit_drafted_questions` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above.
2. When the user selects a unit, use `define-terms` to propose precise definitions, then call `submit_defined_terms` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above.
3. After the user agrees to the definitions, use `define-resolution-source` to propose a ranked source hierarchy. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. First call `propose_resolution_sources` with names, publishers, and exact URLs; after approval, call `submit_resolution_source` with the full source records and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and offer a nearby/proxy `alternative_market` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, pass its exact display-question unit as `selected_unit` with its number to `define-terms`; do not submit or reuse the original hierarchy or definitions, and re-evaluate the alternative sources after the new definitions are agreed.
4. If the input lacks a specific event, threshold, or time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates and renders selectable binary, scalar, categorical, and template question units.
- `submit_defined_terms` validates and renders the selected unit with its definitions.
- `propose_resolution_sources` validates and renders a concise ranked source proposal with clickable URLs, silently preflights every main and alternative URL and keeps only final HTTP-200 links, rejects repeated publishers/source agencies, and renders coverage warnings or a newly drafted selectable alternative display-question unit with a `define-terms` handoff when supplied. Do not expose the preflight statuses or failure details.
- `submit_resolution_source` validates and renders full user-facing source details, rejecting repeated publishers/source agencies. It still performs advisory URL checks and retains one aggregate warning for unavailable sources, while its Markdown omits transient individual statuses and the `publiclyAccessible` metadata.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
