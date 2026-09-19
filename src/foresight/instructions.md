# Bleavit Foresight MCP server

The packaged skills own semantic drafting and research. This server owns
validation, rendering, workflow state, and approvals. Follow the active skill's
reference for stage-specific rules; do not reproduce those rules from this
file or from tool descriptions.

## Workflow state

Submission tools validate and store a pending stage; they never approve it.
After the user explicitly accepts the rendered stage, call
`approve_forecast_specification` in this order:

1. `selected_unit`
2. `defined_terms`
3. `resolution_sources`
4. `resolution_criteria`
5. `background_information`
6. optional `news_timeline`, only after explicit opt-in

Carry the returned `forecast_specification_id` and immutable `language_code`
between calls. They are internal metadata: never expose them in chat, errors,
approval summaries, or exports. A new language or selected alternative is a
new record: set `start_new_specification: true`, omit the old ID, and obtain new
approvals. An omitted ID resolves only within the current MCP session; an
explicit ID may address the process-lifetime HTTP handoff registry. The ID is a
bearer handoff, not authentication, and in-memory data disappears when the
server stops.

`get_approved_forecast_specification` returns approved stages only. Call it
when the user asks to recall a specification or chooses an export format, not
automatically after approval.

## Language and rendering

Choose the canonical BCP 47 language from the request that starts the record,
unless the user explicitly chooses another. Keep every specification field and
workflow follow-up in that language. Conversation may follow the user's latest
language, but a language switch does not mutate the active record; offer to
continue in the locked language or start a separate translated record.

Tool Markdown is an English rendering scaffold. Translate only generated
labels and fixed UI text. Preserve data-bearing content exactly, including
questions, definitions, placeholders, variable values, source identities,
URLs, ranks, dates, and status codes. For every reviewed stage, show the exact
selected unit first, then `---`, the complete rendered stage, another `---`,
and its follow-up. Add missing separators only; do not summarize, reorder, or
expose raw structured content.

Decision interviews use numbered questions and lettered options (`1.A`,
`1.B`), never dotted numeric choices. Ask two or three substantive options plus
a separate free-form fallback and a recommendation. Stage-specific interview
logic and formats live in the relevant skill reference.

## Completion and exports

After background approval, suppress the approval payload and show only this
localized menu:

```text
1. Show YAML in chat and download the YAML file
2. Show JSON in chat and download the JSON file
3. Show Markdown in chat and download the Markdown file
4. Download the PDF file
5. Add the optional recent-news timeline
```

After news is approved, declined, empty, or unavailable, omit option 5. Accept
one or several menu numbers. Retrieve the record once, remove internal
metadata, show complete YAML, JSON, and Markdown in labeled fenced blocks with
matching download links, and provide PDF as a download. Then ask whether the
Forecast Specification looks correct; route requested changes through the
affected stage and repeat its review and approvals.

## Validation errors

A validation error means nothing was persisted. Correct only the reported
field, preserve the rest of the payload, and retry. When criteria validation
fails, show only the corrected field and value and say that the existing
Forecast Specification was unchanged; do not repeat unchanged criteria.
