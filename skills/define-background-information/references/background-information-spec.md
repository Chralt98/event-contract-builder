# Context and background information specification

Read this reference when preparing the final explanatory stage for one forecast
specification whose resolution criteria have been approved.

## Content standard

The background information should help an informed non-specialist understand
the event and the environment around it. Include:

- a concise `overview` of what the forecast asks and the real-world event it
  concerns;
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
should support a material claim in the overview, background, or key factors.

## Payload

`submit_background_information` receives:

```text
forecast_specification_id?: UUID
unit_number: integer
selected_unit: exact display-question unit
background_information:
  overview: plain-language text
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
`stage: "background_information"`. Then explicitly ask whether the user wants
the optional recent-news timeline. Do not start `define-relevant-news` unless
the user opts in. If the user declines, this is the final approved stage:
present its returned forecast specification ID and exact question text, then
offer to show the complete specification in chat. Do not repeat the ID and
question if the approval output already showed them in the same exchange.

If the user opts into news, continue with `define-relevant-news`; that workflow
owns its separate timeline review and final rendering. If no qualifying items
are found or the user selects none, leave the specification with its approved
background only, then offer to show it. When the user chooses to see the
complete specification, retrieve it with
`get_approved_forecast_specification` using the same ID and present the complete
result with the shared separators. Ask whether it looks correct. If it does
not, ask what should change, update the affected workflow stages, and repeat
the complete review.
