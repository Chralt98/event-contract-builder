# Bleavit Foresight MCP server

The packaged skills provide the semantic workflow for building forecast specifications. This server provides deterministic validation, rendering, and advisory source-link checks for the structured outputs produced by those skills.

## Approved forecast specification memory

The submission tools keep each validated workflow handoff in the current MCP
session as pending workflow state: the candidate draft for handoff matching,
plus the selected unit, definitions, and detailed source
records. A submission is not user approval. Call
`approve_forecast_specification` only after the user explicitly approves the matching
stage in chat; only then is that stage exposed by
`get_approved_forecast_specification`. Each successful submission returns a
`forecast_specification_id` in its structured content.
Preserve that identifier and pass it to the next workflow tool so multiple
Forecast specifications in one chat remain separate. HTTP sessions also publish snapshots to
a process-lifetime handoff registry, but that registry is addressable only by
an explicitly supplied `forecast_specification_id`; an omitted ID never searches it. The
identifier is a random bearer handoff, not authentication or authorization,
and all in-memory data is lost when the server process ends.

When the user asks to recall or show the saved forecast specification, call
`get_approved_forecast_specification`. Omit `forecast_specification_id` to retrieve the most recently
updated record only when the call is in the same MCP session; pass the requested
identifier when the host may have opened a new HTTP session. If the user selects
a new alternative forecast specification question, start a new record rather than carrying the
original forecast specification ID into that branch. Recall exposes only the approved
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

1. Use `draft-display-question` to turn a sufficiently specific future event into selectable display-question units. When related concrete questions form a reusable family, retain them and append the additional template unit defined by the skill. Then call `submit_drafted_questions` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Preserve the returned `forecast_specification_id` for the selected unit's next step.
2. When the user selects a unit, call `submit_selected_unit` with the exact selected unit and carry its returned `forecast_specification_id`. This submission is pending; after the user's selection is explicit in chat, call `approve_forecast_specification` with `stage: "selected_unit"`. Then use `define-terms` as the immediate next workflow stage. Pass the carried identifier to `submit_defined_terms` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Carry the returned identifier forward. After the user explicitly agrees to the definitions, call `approve_forecast_specification` with `stage: "defined_terms"` before continuing.
3. After the user agrees to the definitions, use `define-resolution-source` to identify and register the complete Resolution Source Hierarchy in one step. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. Select each URL using the URL locator policy: prefer a known durable event-specific results/data page; otherwise use the publisher's stable canonical results, data, or topic hub. Use methodology pages or press releases only as supporting references, not as the binding data locator, and never use a historical page for a different event or a guessed future path. Verify that source publication schedules match the display question's timeframe. Call `submit_resolution_source` once with the carried `forecast_specification_id`, exact selected unit, full source records, and any applicable `coverage_gaps` or `alternative_forecast_specification`, then present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. There is no separate source-hierarchy proposal or approval stage. After the user approves the detailed hierarchy, call `approve_forecast_specification` with `stage: "resolution_sources"`. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and explicitly ask whether the user wants to proceed with one source, use a nearby/proxy `alternative_forecast_specification` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources, or provide a fallback source they know so it can be evaluated and added. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, start a separate record by calling `submit_selected_unit` with its exact display-question unit and number, then call `approve_forecast_specification` with `stage: "selected_unit"`; after that approval pass the same unit to `define-terms`, omit the original `forecast_specification_id`, and do not submit or reuse the original hierarchy or definitions. Re-evaluate the alternative sources after its new definitions are approved.
4. If the input lacks a specific event, threshold, or time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates, stores, and renders selectable binary, scalar, categorical, and template question units.
- `submit_selected_unit` validates and stores the user's selected display-question unit as pending; it does not approve the selection.
- `submit_defined_terms` validates, stores, and renders the selected unit with its definitions.
- `submit_resolution_source` validates, stores, and renders the complete Resolution Source Hierarchy, rejecting repeated publishers/source agencies. Source URLs are stored as user-facing inspection locators and are not fetched or verified by the MCP server.
- `approve_forecast_specification` records an explicit user approval for one pending MCP-backed stage; it must be called after the matching chat confirmation and in workflow order: selected unit, definitions, then detailed sources.
- `get_approved_forecast_specification` retrieves only the selected unit, definitions, and source records whose stages have been explicitly approved for one forecast specification in the current session, or via an explicit `forecast_specification_id` handoff across HTTP sessions, and renders them together.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.

