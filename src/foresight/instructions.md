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

Every successful workflow submission and approval returns `review_markdown`. 
Return the `review_markdown` verbatim.
For submissions, and for approvals that complete the workflow, it is the
authoritative, complete user-facing result: reply with that exact string and
nothing else. Intermediate approval reviews are never user-facing. Treat the
approval as a silent transition, immediately invoke the next stage, and present
only that next stage's review. Do not summarize, reword, reorder, omit fields,
or add a preface. Translate only generated labels and fixed UI text; preserve
data-bearing content exactly, including questions, definitions, placeholders,
variable values, source identities, URLs, ranks, dates, and status codes.

Each pending-stage review uses this exact structure:

```text
# Forecast Specification
## Stage: <stage name>
### Selected Unit
<exact selected unit>
---
### <stage name>
<complete stage content>
---
## Next Action
<exact follow-up>
```

Draft reviews replace `Selected Unit` with `Draft Units`. Label draft units
with plain 1-based numbers (`Unit 1`, `Unit 2`, `Unit 3`) and refer to those
same numbers in the selection follow-up; do not add letter suffixes. Approval
and completion reviews retain the same outer headings and include only the
content appropriate to that stage. A blocked workflow response identifies
`required_approval_stage`; approve that stage before retrying the blocked tool.

Decision interviews within a stage use numbered questions and lettered options
(`1.A`, `1.B`), never dotted numeric choices. Ask two or three substantive
options plus a separate free-form fallback and a recommendation. Stage-specific
interview logic and formats live in the relevant skill reference.

## Completion and exports

After background approval, the canonical completion review contains this
localized menu:

```text
1. Show YAML in chat
2. Show JSON in chat
3. Show Markdown in chat
4. Add the optional recent-news timeline
```

After news is approved, declined, empty, or unavailable, omit option 4. Accept
one or several menu numbers. Retrieve the record once, remove internal
metadata, and serialize the complete returned record without reconstructing it
from memory or summarizing it. Preserve every field and nested array or object
when present, in each requested YAML, JSON, or Markdown export. Show
each export completely in a labeled fenced block. Then ask whether the Forecast
Specification looks correct; route requested changes through the affected stage
and repeat its review and approvals.

## Validation errors

A validation error means nothing was persisted. Correct only the reported
field, preserve the rest of the payload, and retry. When criteria validation
fails, show only the corrected field and value and say that the existing
Forecast Specification was unchanged; do not repeat unchanged criteria.
