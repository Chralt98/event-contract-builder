# Event Contract Builder MCP server

The packaged skills provide the semantic workflow for building prediction-market event contracts. This server provides deterministic validation, rendering, and advisory source-link checks for the structured outputs produced by those skills.

## Approved contract memory

The submission tools keep each validated workflow handoff in the current MCP
session as pending workflow state: the candidate draft for handoff matching,
plus the selected unit, proposed timing, definitions, proposed source
hierarchy, and detailed source records. A submission is not user approval. Call
`approve_event_contract` only after the user explicitly approves the matching
stage in chat; only then is that stage exposed by
`get_approved_event_contract`. Each successful submission returns a
`contract_id` in its structured content.
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
2. When the user selects a unit, call `submit_selected_unit` with the exact selected unit and carry its returned `contract_id`. This submission is pending; after the user's selection is explicit in chat, call `approve_event_contract` with `stage: "selected_unit"`. Then use `define-timing` before any term definition or source selection. The immediate next stage after display-question selection is timing; terms come only after timing approval. Derive the event deadline or observation window from the question when explicit; require exact ISO 8601 UTC timestamps, named IANA time zones, and inclusive/exclusive boundary rules. For measurements, record observation start and end. Always produce a complete, clearly provisional proposal for every timing field, including suggested values for fields missing from the question, and state the assumptions so the user can review and correct them. Always show the fixed timing definitions and ask whether occurrence time, qualifying publication time, or both control. Suggest trading start/end and expiration together in the skill's conversational proposal. Let the user correct or confirm it. After confirmation, call `submit_timing` with the complete final timing fields and present its returned Markdown. The conversational confirmation is the timing approval; call `approve_event_contract` with `stage: "timing"` immediately after `submit_timing`, without asking for a second timing confirmation. Pass approved timing unchanged to the downstream skills and retain its `contract_id`. If later source review makes the timing infeasible, return to `define-timing` for an explicit revision.
3. After timing is approved, use `define-terms` to propose precise definitions, pass the carried identifier to `submit_defined_terms`, and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Carry the returned identifier forward. After the user explicitly agrees to the definitions, call `approve_event_contract` with `stage: "defined_terms"` before continuing.
4. After the user agrees to the definitions, use `define-resolution-source` to propose a ranked source hierarchy. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. Select each URL using the URL locator policy: prefer a known durable event-specific results/data page; otherwise use the publisher's stable canonical results, data, or topic hub. Use methodology pages or press releases only as supporting references, not as the binding data locator, and never use a historical page for a different event or a guessed future path. Use the approved timing when evaluating publication schedules; do not silently change it. First call `propose_resolution_sources` with the carried `contract_id`, names, publishers, and policy-selected source URLs; after the user approves that hierarchy, call `approve_event_contract` with `stage: "proposed_resolution_sources"`, then call `submit_resolution_source` with the same identifier and full source records and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. After the user approves the detailed source records, call `approve_event_contract` with `stage: "resolution_sources"`. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and offer a nearby/proxy `alternative_market` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, start a separate record by calling `submit_selected_unit` with its exact display-question unit and number, then call `approve_event_contract` with `stage: "selected_unit"`; only after that approval pass the same unit to `define-timing`, omit the original `contract_id`, and do not submit or reuse the original hierarchy or definitions. Re-evaluate the alternative sources after its timing and new definitions are approved.
5. If the input lacks a specific event, threshold, or time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates, stores, and renders selectable binary, scalar, categorical, and template question units.
- `submit_selected_unit` validates and stores the user's selected display-question unit as pending; it does not approve the selection.
- `submit_defined_terms` validates, stores, and renders the selected unit with its definitions.
- `propose_resolution_sources` validates, stores, and renders a concise ranked source proposal with clickable URLs, silently preflights every main and alternative URL and keeps only final HTTP-200 links, rejects repeated publishers/source agencies, and renders coverage warnings or a newly drafted selectable alternative display-question unit with a `define-timing` then `define-terms` handoff when supplied. Do not expose the preflight statuses or failure details.
- `submit_resolution_source` validates, stores, and renders full user-facing source details, rejecting repeated publishers/source agencies. It still performs advisory URL checks and retains one aggregate warning for unavailable sources, while its Markdown omits transient individual statuses and the `publiclyAccessible` metadata.
- `submit_timing` validates, stores, and renders the complete timing after the `define-timing` skill's conversational proposal has been confirmed, including the event boundary or observation window, evidence rule, trading schedule, expiration datetime, UTC timestamps, IANA time zones, and the recommended proposal shape. Immediately follow it with `approve_event_contract` at `stage: "timing"`; do not request a second timing confirmation.
- `approve_event_contract` records an explicit user approval for one pending MCP-backed stage; it must be called after the matching chat confirmation and in workflow order: selected unit, timing, definitions, source proposal, then detailed sources.
- `get_approved_event_contract` retrieves only the selected unit, timing, definitions, and source records whose stages have been explicitly approved for one contract in the current session, or via an explicit `contract_id` handoff across HTTP sessions, and renders them together.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
