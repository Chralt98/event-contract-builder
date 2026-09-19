# Bleavit Foresight MCP server

The packaged skills provide the semantic workflow for building forecast specifications. This server provides deterministic validation, rendering, and advisory source-link checks for the structured outputs produced by those skills.

## Approved forecast specification memory

The submission tools keep each validated workflow handoff in the current MCP
session as pending workflow state: the candidate draft for handoff matching,
plus the selected unit, definitions, detailed source records, resolution
criteria, context/background information, and any optional news timeline. A submission is not user approval. Call
`approve_forecast_specification` only after the user explicitly approves the matching
stage in chat; only then is that stage exposed by
`get_approved_forecast_specification`. Each successful submission returns a
`forecast_specification_id` and the record's `language_code` in its structured
content. Preserve both values and pass them through the workflow so multiple
forecast specifications in one chat remain separate. HTTP sessions also publish snapshots to
a process-lifetime handoff registry, but that registry is addressable only by
an explicitly supplied `forecast_specification_id`; an omitted ID never searches it. The
identifier is a random bearer handoff, not authentication or authorization,
and all in-memory data is lost when the server process ends.

Both `forecast_specification_id` and `language_code` are internal workflow
metadata. Never show either value to the user in prose, headings, code blocks,
raw structured payloads, exported YAML or JSON, Markdown, PDF, error messages,
or approval summaries. Use them only in tool calls and internal state. Refer to
the finished artifact as the `Forecast Specification`; do not label it an
"approved specification" or "genehmigte Spezifikation" in user-facing text.

When the user asks to recall or show the saved forecast specification, call
`get_approved_forecast_specification`. Omit `forecast_specification_id` to retrieve the most recently
updated record only when the call is in the same MCP session; pass the requested
identifier when the host may have opened a new HTTP session. If the user selects
a new alternative forecast specification question, start a new record rather than carrying the
original forecast specification ID into that branch. Recall exposes only the approved
selected unit, definitions, source records, resolution criteria, background information, and any approved optional news timeline; it does not replay the initial
candidate-question draft, workflow follow-ups, or unselected alternatives.
After background approval, present the standard next-action menu described
below. Once the user declines news, no qualifying items are found, or they
approve the news timeline, present the same menu without the news option. Call
`get_approved_forecast_specification` only when the user chooses an output
format.

## Consistent user-facing presentation

Use the same compact visual system throughout every run: short Markdown
headings, one purposeful emoji per block, numbered choices, bold labels, and
`---` only between major blocks. Do not add decorative charts or diagrams when
they do not clarify a real relationship.

Every decision interview numbers questions `1`, `2`, and so on and gives the
choices for each question capital-letter labels. Reference every choice with a
combined identifier such as `1.A`, `1.B`, `2.A`, or `2.B`. Never use dotted
numeric identifiers such as `1.1` or `2.2`; the letter makes the question
number and its choices visually distinct. Start each interactive round with
`🧭 **Question round <current> of <total>**`, translated into the specification
language. Format each decision as:

```text
❓ **1 · <short title>**
<one clear question>

**1.A** — **<option>** — <short consequence>
**1.B** — **<option>** — <short consequence>
**1.C** — **<option>** — <short consequence>

➡️ **Recommendation:** Option 1.<letter> — <brief reason>
↪️ If none fits, state the result or behavior you want.
```

Use two or three substantive choices when a user decision is required. Never
replace the choices with only a recommendation. Omit a third choice rather
than padding the list. Keep all questions in one round in the same structure
and separate them with `---`.

The final action menu is a fixed output menu rather than a decision interview.
After background approval, show only this localized menu and no question text,
identifier, language code, approval payload, or repeated specification content:

```text
✨ **Forecast Specification ready**
How would you like to continue?

1. Show YAML in chat and download the YAML file
2. Show JSON in chat and download the JSON file
3. Show Markdown in chat and download the Markdown file
4. Download the PDF file
5. Add the optional recent-news timeline
```

After the news timeline is approved, declined, empty, or unavailable, show the
same menu with options 1 through 4 only. The user may choose one or several
menu numbers in one response, such as `1` or `1 und 2`; fulfill every selected
format. A format choice authorizes retrieval with
`get_approved_forecast_specification`. For YAML, JSON, and Markdown, always
show the complete result in a correctly labeled fenced code block and create a
downloadable file with the matching extension. Place the download link directly
below its code block. For PDF, create and link the downloadable file. Omit
internal metadata from every format. For YAML and JSON, use descriptive
user-facing keys and exclude
`forecast_specification_id` and `language_code`. For Markdown and PDF, preserve
the clean section hierarchy used in chat. PDF creation may use the host's
document or PDF capability after the user chooses PDF.

## Specification language

Determine the specification language from the user's first request that starts
the specification, unless the user explicitly chooses another language. Store
it as the canonical BCP 47 `language_code` (for example, `de`, `en`, or
`en-GB`) when calling `submit_drafted_questions`. Treat that code as immutable
for the life of the record. Every specification field and workflow follow-up,
including questions, definitions, source notes, criteria, background
information, news items, and user-facing alternatives, must be written in that language.
Use the returned `language_code` at every later stage; never infer a replacement
from the latest message or silently change the code.

Conversation about the work may follow the user's latest language. When the
user switches languages while a specification is active, briefly remind them
which language is locked, keep specification content in that language, and
offer two choices: continue the current specification in its locked language,
or start a separate specification in the newly requested language. Do not
translate or create the separate record until the user chooses it.

If the user chooses a separate language, translate the approved outputs from
the existing record into that language. Start a new record with
`submit_selected_unit`, set `start_new_specification: true`, omit the old
`forecast_specification_id`, and pass the target `language_code`. A new record
has a different identifier and no inherited approvals. Submit and obtain a new
explicit approval for each stage in workflow order. Translate only outputs
whose stages were approved in the original record; draft any pending or
unsubmitted stage anew in the target language and obtain its approval too.
Never copy an approval from one language record to another. Use the same
explicit new-record flag for a selected alternative question when that branch
must be independent, even if it keeps the current language.

If no selected-unit stage has been approved in the original record yet, there
is no approved selection to translate. Start the separate-language workflow
with a fresh `submit_drafted_questions` call in the target language instead;
do not carry over the original record ID or any approval.

The deterministic tool output is an English rendering scaffold. When
presenting it, translate renderer-generated labels, headings, warnings, and
other fixed UI text into the specification's locked language. Preserve all
user-authored and data-bearing content exactly, including questions,
definitions, source names, publishers, URLs and Markdown link targets,
variable names and values, placeholders, dataset IDs, rank numbers, HTTP
status codes, and other factual values. Keep the same structure and include
all content; do not expose the raw structured payload.

## Validation-error recovery

If a submission tool returns an input-validation error, treat the submission as rejected before persistence. Use the reported field path and validation message to correct only the offending value, preserve every other value unchanged, and retry the submission with the corrected payload.

Do not print or ask the user to review the full criteria again after this kind of retry. In the user-facing recovery message, show only the updated field and value that caused the error, then explain that validation blocked the first submission, the existing forecast specification was not changed, and the corrected submission is now pending. If a second validation error occurs, show only that next field and corrected value rather than restating the full resolution criteria.

This recovery behavior overrides the normal instruction to present the complete
returned Markdown for the failed submission.

## Workflow

1. Use `draft-display-question` to turn a sufficiently specific future event into at least three distinct selectable display-question units: a direct interpretation plus close reformulation, proxy, or better-specified interpretations that preserve the user's intent. Add a template only when its finite, explicit values all preserve the same qualifying predicate, interpretation, settlement source, formula, procedure, methodology, and legal/compliance analysis; a template is optional and does not replace one of the three substantive alternatives. Set the canonical `language_code` from the first request that starts the specification (or an explicit language choice), then call `submit_drafted_questions` with every field and follow-up in that language. Present its complete returned Markdown, inserting any missing separators according to the consistent presentation rules above while preserving all question text and data. Preserve both `forecast_specification_id` and `language_code` for the next step.
2. When the user selects a unit, call `submit_selected_unit` with the exact selected unit, the carried `language_code`, and the carried `forecast_specification_id`. For a branch that must be a separate record, set `start_new_specification: true` and omit the old ID. This submission is pending; after the user's selection is explicit in chat, call `approve_forecast_specification` with `stage: "selected_unit"`. Then use `define-terms` as the immediate next workflow stage. Carry the same language code and identifier forward, write all specification fields in that language, and present each stage with the consistent separators above. After the user explicitly agrees to the definitions, call `approve_forecast_specification` with `stage: "defined_terms"` before continuing.
3. After the user agrees to the definitions, use `define-resolution-source` to identify and register the complete Resolution Source Hierarchy in one step. Prefer independently produced sources from distinct publishers/source agencies; never present a second page, dataset, mirror, re-publication, or alias of the same agency as an independent fallback. Select each URL using the URL locator policy: use a known durable event-specific results/data page only when it is explicitly intended to receive the relevant result or is part of a recurring publication system that will be updated for the event; otherwise use the source entity's stable canonical publication hub where the future item is most likely to appear, such as its official legal gazette, legislation/results search, official statistics or data portal, registry, or press-release/newsroom index. For an announcement forecast, prefer the entity's announcement channel over a historical announcement, background FAQ, parliamentary debate page, or general topic article. An individual historical press release, methodology page, documentation page, or explanatory article is supporting evidence only unless it is itself the durable, updateable publication channel; a canonical press-release or newsroom hub is a valid binding locator when that is where the entity publishes the relevant announcements. Before submission, ask whether the publisher would reasonably be expected to publish the exact future fact at that URL when it becomes available; if not, find the entity-level publication hub or record the gap. Recurring sources need a compatible release cadence, while event-driven sources need an identifiable official publication channel. Never use a page for a different historical event, an ephemeral session or tracking URL, or a guessed future path. Call `submit_resolution_source` once with the carried `forecast_specification_id`, exact selected unit, full source records, and any applicable `coverage_gaps` or `alternative_forecast_specification`, then present its complete returned Markdown with the consistent separators above, translating only renderer-generated English text as described above. There is no separate source-hierarchy proposal or approval stage. After the user approves the detailed hierarchy, call `approve_forecast_specification` with `stage: "resolution_sources"`. If no independent fallback exists, a primary-only hierarchy is allowed but must retain the warning and explicitly ask whether the user wants to proceed with one source, use a nearby/proxy `alternative_forecast_specification` containing a newly drafted `display_question_unit`, its `unit_number`, and at least two independent sources, or provide a fallback source they know so it can be evaluated and added. If any required fact lacks a primary source, list it in `coverage_gaps` and offer that display-question alternative without silently changing the selected question or supplying new definitions. If the user selects the alternative, start a separate record by calling `submit_selected_unit` with its exact display-question unit and number, the current `language_code`, and `start_new_specification: true`; omit the original `forecast_specification_id`. Then call `approve_forecast_specification` with `stage: "selected_unit"`; after that approval pass the same unit to `define-terms` and do not submit or reuse the original hierarchy or definitions. Re-evaluate the alternative sources after its new definitions are approved.
4. After the user approves the detailed source hierarchy, use `define-resolution-criteria` to define source-grounded rules for every binary question represented by the selected unit. Before constructing criteria, run its adapted Matt Pocock `grilling` decision interview: map only the decisions needed for this unit, track the round count, and use the consistent question-round format above. Write every specification-related question, progress line, fixed label, and follow-up in the locked language from `language_code`; label questions numerically and their choices with combined identifiers such as `1.A` and `1.B`. For an estimate, immediately suggest answering every question in that round in one response, explicitly accepting or rejecting each recommendation, including any custom fallback, and stating decisions that logically follow. Preserve prerequisite order, never skip unresolved decisions, and update the estimate if the frontier changes. Ask every currently answerable user-dependent decision separately, with two or three distinct, reasonable possibilities and a recommendation. Treat a free-form fallback as valid input; if the user says none fits without specifying what they prefer, ask what they want instead. Wait for answers, record custom direction, recompute the frontier, and repeat until no decision remains. Do not pad choices or treat recommendations or a combined confirmation as answered questions. When waiting for answers, make the complete question round the final user-visible response for that turn: show the exact selected unit first, then `---`, then its progress line, every question, lettered options, fallback invitation, recommendation, and question separator. Never emit the round only as commentary or follow it with a final response containing only a generic prompt such as "Please answer the questions." After all rounds are settled, construct the criteria in the locked language and call `submit_resolution_criteria` directly, exactly once. Put every ordinary qualifying requirement, including the deadline, into the necessary-and-sufficient Yes condition. Keep the No rule to the concise complement and render it simply as "Otherwise it resolves to No." Do not repeat the Yes elements as a list of negative No subconditions. Do not show a separate pre-submission criteria draft or ask the user to confirm criteria before submitting. Present the complete returned Markdown with the shared separators above, translating fixed labels into the locked language; this submitted criteria output is the single criteria review. After the user explicitly approves that output, call `approve_forecast_specification` with `stage: "resolution_criteria"`. Do not present the complete Forecast Specification yet. Continue to context/background information.
5. After resolution criteria are approved, use `define-background-information` to research and draft neutral, durable historical, institutional, procedural, and domain context for the selected forecast specification. Keep the exact selected unit unchanged and distinguish explanatory references from the binding resolution-source hierarchy. Leave transient current-status claims and recent news for the separate optional step. Call `submit_background_information` once with the carried `forecast_specification_id`, exact selected unit and unit number, complete `background_information`, and a follow-up asking whether the user approves it or wants changes, all in the locked language. The background payload contains `background`, `keyFactors`, and optional `references`; it has no overview. Present the complete returned Markdown with the shared separators above. The submission is pending until the user explicitly agrees; then call `approve_forecast_specification` with `stage: "background_information"`. After that approval, show only the standard five-option action menu. Do not invoke `define-relevant-news` or submit a news timeline unless the user chooses that option.
6. Only after explicit opt-in to recent news, use `define-relevant-news`. Research relevant, recent information and prepare a newest-to-oldest timeline of no more than twelve items. Each item must show its publication date and verified time when available, publisher, direct source URL, and a succinct objective summary containing only information that is new relative to the historical background and every older timeline item. Assign each item a unique news-item unit number. Submit the proposed timeline with `submit_news_timeline`, then show the complete returned timeline and its follow-up in the same final user-visible response; never replace it with a summary or approval question alone. Ask which numbered items the user considers relevant or wants revised. After the user selects items, submit only that selected subset, preserving its original news-item unit numbers, and again show the complete selected timeline before asking for explicit approval. Approve `news_timeline` only when the user explicitly approves the exact timeline that was fully visible in the immediately preceding assistant response. If the research finds no qualifying news, or the user selects no items, add no timeline and finish with the approved background-only specification. If the user later asks to remove all previously approved news, submit an empty timeline, show that removal state, ask them to approve its removal, and approve `news_timeline` only after that confirmation. Write all news fields and follow-ups in the locked `language_code`.
7. If the input lacks information needed to determine an outcome or apply its time boundary, ask for clarification. Do not invent missing facts or re-draft when the user is selecting an existing unit.

## Final approved rendering

When `approve_forecast_specification` succeeds with `stage: "background_information"`, suppress its structured payload and show only the standard five-option action menu. When news is approved, declined, empty, or unavailable, show only the four export options. Never show the Forecast Specification ID, language code, or approval payload. If the user chooses one or more of YAML, JSON, Markdown, or PDF, call `get_approved_forecast_specification` internally once, remove internal metadata, and produce every selected format. Always show YAML, JSON, and Markdown inline in labeled fenced code blocks and also provide each as a downloadable file; provide PDF as a downloadable file. After showing the complete Forecast Specification, ask whether it looks correct; if not, ask what should be changed. Route requested changes through the affected workflow stage, obtain the required approvals again in order, retrieve the updated Forecast Specification, and repeat the review.

## Deterministic tools

- `submit_drafted_questions` validates, stores, and renders at least three distinct selectable binary, scalar, categorical, or template forecast specification units. Grouped questions inside one scalar or categorical unit do not satisfy the three-unit minimum, and duplicate units are rejected.
- `submit_selected_unit` validates and stores the user's selected display-question unit as pending; it does not approve the selection.
- `submit_defined_terms` validates, stores, and renders the selected unit with its definitions.
- `submit_resolution_source` validates, stores, and renders the complete Resolution Source Hierarchy, rejecting repeated publishers/source agencies. Source URLs are stored as user-facing inspection locators and are not fetched or verified by the MCP server.
- `submit_resolution_criteria` validates, stores, and renders broad Resolution Criteria with one rule for each constituent binary question. It requires approved resolution sources first.
- `submit_background_information` validates, stores, and renders neutral context/background information with relevant background, key factors, and optional non-binding references. It requires approved resolution criteria first.
- `submit_news_timeline` validates, stores, and renders the optional newest-to-oldest news timeline. It requires approved background information first; news-item unit numbers must be unique and dates must be in descending order. Submit an empty list only when the user explicitly approves removal of a previously approved timeline. Source URLs are rendered for inspection and are not fetched or verified by the MCP server.
- `approve_forecast_specification` records an explicit user approval for one pending MCP-backed stage; it must be called after the matching chat confirmation and in workflow order: selected unit, definitions, detailed sources, resolution criteria, background information, then optional news timeline. Its structured content carries internal workflow metadata, while its user-facing summary shows only the localized next-action menu.
- `get_approved_forecast_specification` retrieves only the selected unit, definitions, source records, resolution criteria, background information, and any news timeline whose stages have been explicitly approved for one forecast specification in the current session, or via an explicit `forecast_specification_id` handoff across HTTP sessions, and renders them together.

Keep semantic drafting and definition guidance in the packaged skills; keep tool descriptions and these instructions concise and complementary.
