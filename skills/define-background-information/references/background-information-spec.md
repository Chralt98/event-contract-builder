# Context and background information specification

Read this reference when preparing the final explanatory stage for one forecast
specification whose resolution criteria have been approved.

## Content standard

The background information should help an informed non-specialist understand
the event and the environment around it. Include:

- `background` covering only relevant historical, institutional, procedural, or
  domain context;
- `keyFactors` describing the main observable developments that could affect the
  outcome, without assigning probabilities; and
- optional public `references` when they materially support the factual context.

Favor durable historical, institutional, procedural, and domain facts over
live-status updates and short-lived developments. Do not use this stage for a
current news roundup; recent developments belong in the separate optional
news-timeline workflow after explicit user opt-in.
Describe disputed or uncertain contextual claims accurately. Do not repeat the
resolution criteria as prose or introduce a competing interpretation of the
selected question.

## References

When useful references are available, provide them with `title`, `publisher`,
and `url`. Prefer authoritative, directly relevant material. A reputable
secondary source may be used when it explains context that no concise primary
source covers. Reference URLs must be distinct. Omit `references` when no
reference materially improves the context.

Any supplied references are informational only. They do not determine
settlement, change the approved resolution-source hierarchy, or become fallback
resolution sources. Avoid citing a page merely because it mentions the topic; it
should support a material claim in the background or key factors.

## Payload

`submit_background_information` receives:

```text
forecast_specification_id?: UUID
unit_number: integer
selected_unit: exact display-question unit
background_information:
  background: relevant explanatory text
  keyFactors:
    - one relevant observable factor
  references?:
    - title: human-readable title
      publisher: source organization
      url: public URL
followUp: one question about approval or requested changes
```

Keep the selected unit exactly unchanged, including every question, template
placeholder, variable, and allowed value. Carry the
`forecast_specification_id` returned by the prior workflow step.

## Review and approval

Present the complete rendered context/background submission for review using
the shared layout: selected unit, `---`, background information, `---`,
follow-up. Insert missing separators as presentation formatting only. The
submission does not imply approval. If the user requests edits, resubmit the
complete revised payload; do not alter already approved upstream stages.

Only after explicit approval call `approve_forecast_specification` with
`stage: "background_information"`. Never display the returned internal ID,
language code, structured payload, or repeat the forecast question. Show only
the localized standard action menu: YAML in chat and as a download, JSON in
chat and as a download, Markdown in chat and as a download, PDF as a download,
or the optional recent-news timeline. Use `and`, not `or`, for the first three
choices. Do not start `define-relevant-news` unless the user
chooses that option.

If the user opts into news, continue with `define-relevant-news`; that workflow
owns its separate timeline review and final rendering. If no qualifying items
are found or the user selects none, leave the specification with its approved
background only, then show the four export options. When the user chooses one
or more output numbers, retrieve the specification internally once with
`get_approved_forecast_specification`, omit the internal ID and language code,
and provide every requested clean output. Show YAML, JSON, and Markdown in
labeled fenced code blocks and also provide a download link for each matching
file; provide PDF as a download. Ask whether it looks correct. If it
does not, ask what should change, update the affected workflow stages, and
repeat the complete review.
