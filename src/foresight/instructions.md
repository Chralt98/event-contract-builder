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
selected unit, definitions, source records, and resolution criteria; it does not replay the initial
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

## Validation-error recovery

If a submission tool returns an input-validation error, treat the submission as rejected before persistence. Use the reported field path and validation message to correct only the offending value, preserve every other value unchanged, and retry the submission with the corrected payload.

Do not print or ask the user to review the full criteria again after this kind of retry. In the user-facing recovery message, show only the updated field and value that caused the error, then explain that validation blocked the first submission, the existing forecast specification was not changed, and the corrected submission is now pending. If a second validation error occurs, show only that next field and corrected value rather than restating the full resolution criteria.

This recovery behavior overrides the normal instruction to present the complete
returned Markdown for the failed submission.

## Workflow

1. Use `draft-display-question` to turn a sufficiently specific future event into at least three distinct selectable display-question units: a direct interpretation plus close reformulation, proxy, or better-specified interpretations that preserve the user's intent. When related concrete questions form a reusable family, retain them and append the additional template unit defined by the skill; a template does not replace one of the three substantive alternatives. Then call `submit_drafted_questions` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Preserve the returned `forecast_specification_id` for the selected unit's next step.
2. When the user selects a unit, call `submit_selected_unit` with the exact selected unit and carry its returned `forecast_specification_id`. This submission is pending; after the user's selection is explicit in chat, call `approve_forecast_specification` with `stage: "selected_unit"`. Then use `define-terms` as the immediate next workflow stage. Pass the carried identifier to `submit_defined_terms` and present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. Carry the returned identifier forward. After the user explicitly agrees to the definitions, call `approve_forecast_specification` with `stage: "defined_terms"` before continuing.
3. After the user agrees to the definitions, use `define-resolution-source` to identify and register the complete Resolution Source Hierarchy in one step. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. Select each URL using the URL locator policy: prefer a known durable event-specific results/data page; otherwise use the publisher's stable canonical results, data, or topic hub. Use methodology pages or press releases only as supporting references, not as the binding data locator, and never use a historical page for a different event or a guessed future path. Verify that source publication schedules match the display question's timeframe. Call `submit_resolution_source` once with the carried `forecast_specification_id`, exact selected unit, full source records, and any applicable `coverage_gaps` or `alternative_forecast_specification`, then present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. There is no separate source-hierarchy proposal or approval stage. After the user approves the detailed hierarchy, call `approve_forecast_specification` with `stage: "resolution_sources"`. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and explicitly ask whether the user wants to proceed with one source, use a nearby/proxy `alternative_forecast_specification` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources, or provide a fallback source they know so it can be evaluated and added. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, start a separate record by calling `submit_selected_unit` with its exact display-question unit and number, then call `approve_forecast_specification` with `stage: "selected_unit"`; after that approval pass the same unit to `define-terms`, omit the original `forecast_specification_id`, and do not submit or reuse the original hierarchy or definitions. Re-evaluate the alternative sources after its new definitions are approved.
4. After the user approves the detailed source hierarchy, use `define-resolution-criteria` to define source-grounded rules for every binary question represented by the selected unit. Before constructing or submitting criteria, run its adapted Matt Pocock `grilling` decision interview: map only the decisions needed for this unit, track the round count, and start every round with the current round number and the maximum expected number of grilling rounds. Use `🧭 Grilling round <current> of <maximum> total (exact).` when the design tree permits an exact maximum; otherwise use `🧭 Grilling round <current> of about <estimate> total (estimate).` When using an estimate, immediately suggest that the user answer every question in the current round in one response, explicitly accept or reject each recommendation, include any custom fallback, and state any decisions that logically follow, while preserving prerequisite order and not skipping unresolved decisions. Update the estimate if the frontier changes. Then ask every currently answerable user-dependent decision as a separately numbered question with no more than three distinct, reasonable substantive possibilities and a recommended answer, use the exact `❓ **Qn** - **title**` / `➡️ recommendation` / `---` round format, and after each question invite the user to say what should happen if none of the listed possibilities fits. Treat that free-form answer as valid user input, not as a fourth listed option; if the user says none fits without specifying an alternative, ask what they want instead. Wait for the user's answers, record any custom direction, recompute the frontier, and repeat until no decision remains. Do not pad the choices or force a listed choice when none fits. Do not treat a list of recommendations or a combined confirmation as answered questions. When waiting for answers, make the complete grilling round the final user-visible response for that turn: include its progress line, any estimate-reduction suggestion, every question, fallback invitation, recommendation, and separator. Never emit the round only as commentary or follow it with a final response containing only a generic prompt such as "Please answer the questions." Present the complete criteria draft only after all rounds, obtain the user's explicit final confirmation, then call `submit_resolution_criteria` exactly once with the carried `forecast_specification_id`, exact selected unit, unit number, and complete structured `resolution_criteria`. Present its complete returned Markdown faithfully, translating only renderer-generated English text as described above. The submission is pending until the user explicitly agrees; then call `approve_forecast_specification` with `stage: "resolution_criteria"`.
5. If the input lacks information needed to determine an outcome or apply its time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Deterministic tools

- `submit_drafted_questions` validates, stores, and renders at least three distinct selectable binary, scalar, categorical, or template forecast specification units. Grouped questions inside one scalar or categorical unit do not satisfy the three-unit minimum, and duplicate units are rejected.
- `submit_selected_unit` validates and stores the user's selected display-question unit as pending; it does not approve the selection.
- `submit_defined_terms` validates, stores, and renders the selected unit with its definitions.
- `submit_resolution_source` validates, stores, and renders the complete Resolution Source Hierarchy, rejecting repeated publishers/source agencies. Source URLs are stored as user-facing inspection locators and are not fetched or verified by the MCP server.
- `submit_resolution_criteria` validates, stores, and renders broad Resolution Criteria with one rule for each constituent binary question. It requires approved resolution sources first.
- `approve_forecast_specification` records an explicit user approval for one pending MCP-backed stage; it must be called after the matching chat confirmation and in workflow order: selected unit, definitions, detailed sources, then resolution criteria.
- `get_approved_forecast_specification` retrieves only the selected unit, definitions, source records, and resolution criteria whose stages have been explicitly approved for one forecast specification in the current session, or via an explicit `forecast_specification_id` handoff across HTTP sessions, and renders them together.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
