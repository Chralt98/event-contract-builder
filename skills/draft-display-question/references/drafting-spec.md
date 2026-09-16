# Drafting specification

Read this reference when the user is asking for new forecast specification display questions, when a resolution-source review needs a nearby/proxy question, or when deciding whether a message is a selection of an existing draft.

## Role and goal

Act as a forecast specification product copywriter. Turn free-form text about events, forecasts, or outcomes into short, punchy display questions that users immediately understand and can use to assess future outcomes.

Be direct and concise. Do not add filler, hedging, or explanatory padding to the question lines. Use common abbreviations where natural, such as CPI, Fed, and GDP.

For a new event, produce at least three distinct selectable forecast specification units: one direct interpretation plus at least two close reformulations, measurable proxies, or better-specified interpretations that preserve the user's intent. If the user asks for more than three, produce at least that many. The first workflow step must never return fewer than three units. When explicit ranges or options are supplied, produce exactly one concrete question for each inside the relevant direct scalar or categorical unit; those grouped questions do not count as separate selectable units. An additional template unit is allowed, but it does not replace any of the three substantive alternatives.

## Forecast specification decomposition

Forecast specifications resolve as binary Yes/No bets. Decompose scalar and categorical outcomes into groups of binary questions rather than asking one question about the whole outcome.

- **Binary:** A single Yes/No outcome produces one question.
- **Scalar:** A numeric outcome produces one question per sensible range. Ranges must not overlap and should cover the full plausible space so exactly one resolves Yes.
- **Categorical:** A set of mutually exclusive options produces one question per option.
- **Template:** When two or more related concrete questions share stable wording and vary by one or more substitutable values, add a template only if every allowed substitution fits the same fixed settlement framework described below. A template is always additional; it never replaces the binary, scalar, or categorical draft. It is optional when the family cannot be represented safely.

Submission invariant: every new-event draft needs at least three distinct
selectable units. A scalar or categorical group, or a family of related binary
questions, does not require a template when its variations change the qualifying
condition, interpretation, source, settlement method, or legal/compliance
analysis. Never add an unsafe template just to reach a template count. A
template is additional to the three substantive alternatives, and a lone
binary question remains a complete domain unit without one.

## Question rules

Every concrete question must:

- describe a specific future occurrence within a defined time frame;
- preserve the event, threshold, and time period from the input;
- be conversational and scannable;
- be between 10 and 200 characters; and
- end with a question mark.

Drop formal qualifiers, regulatory language, and verbose phrasing. Rephrase or reject input that describes only a past or ongoing state without a forward-looking resolution date.

Do not invent a missing event, date, threshold, option, or factual outcome. Infer sensible ranges or options only when the event and time period are clear and the user did not provide them.

## Resolution-source alternatives

When the resolution-source workflow reports that the selected forecast specification has no
independent fallback or lacks primary coverage for a required fact, draft a new
display-question unit from the original user intent and the stated coverage
constraint. The question may be:

- a close reformulation that changes the unresolvable detail while keeping the
  intent;
- an indirect proxy that measures the intent through a reliably published
  observable; or
- a better-specified forecast specification suggestion that can be resolved by at least two
  independent source agencies.

The result must contain only new user-facing question text (or a complete
question group/template unit). It is not a definitions map and is not selected
until the user explicitly chooses it. The source workflow presents it as
`alternative_forecast_specification.display_question_unit`; only after selection is it passed
to `define-terms` as
`selected_unit`. Never silently replace the original
question, and do not carry the original unit's definitions into the
alternative.

## Template-unit rules

Append one template unit for a useful family of at least two related concrete questions only when the family passes the settlement-invariance check below. This applies whether the concrete family is one scalar/categorical group or several standalone binary units. Do not add a template for a lone question, for questions whose shared wording would be artificial or misleading, or for a family whose values require different settlement treatment.

Construct a template unit as follows:

- Keep the common question wording and replace only a narrow, finite parameter with a descriptive angle-bracket placeholder, such as `<date>`, `<match>`, `<city>`, or `<candidate>`. These examples are safe only when all listed values remain under the same settlement source and method. Do not use broad or open-ended placeholders such as `<event>`, `<outcome>`, or `<country>` when they can cover different kinds of event, authority, or legal/compliance treatment.
- Keep the template question between 10 and 200 characters and end it with a question mark. Its unresolved placeholders are intentional.
- Add `variables` in the order their placeholders first appear in the question.
- For each distinct placeholder, add exactly one variable whose `name` omits the angle brackets and whose non-empty `values` list contains unique concrete choices.
- Every placeholder must have a variable and every variable must appear as a placeholder. Do not add unused variables.
- Use a closed list of explicit concrete values. Do not use wildcard choices such as "any event," "all countries," or "all candidates," and derive values from the user's input or the concrete draft. Do not invent an event, time boundary, threshold, option, or factual outcome merely to populate a variable.
- Use separate placeholders only when their values can be combined meaningfully. If values depend on each other, combine the dependent phrase into one placeholder instead of implying invalid combinations.
- Before submission, instantiate every allowed value and every meaningful combination. Confirm that all instances retain the same qualifying event predicate and interpretation, use the identical authoritative settlement source, formula, procedure, and methodology, and have the same legal/compliance analysis. A date may vary within one recurring series; matches must use the same competition and official result method; cities must remain within the same source and relevant jurisdiction; candidates must remain within the same election and result method. Split the instances into separate units if any value changes the kind of event or condition that qualifies, the applicable interpretation or jurisdiction, the settlement source, formula, procedure, or methodology.
- Do not use a placeholder when the common source or settlement framework cannot be established. The later source review must confirm the same source hierarchy covers every allowed value; resolution criteria must apply one rule uniformly to every allowed substitution. If either later stage finds value-specific treatment is needed, return to drafting and separate those cases instead of adding a value-specific mapping.

The template is selected and handed off as a whole. Selection does not choose one variable value or instantiate a concrete question.

## Selectable units

Further specification operates on one forecast specification at a time:

- each standalone binary question is one unit;
- all range questions for one scalar forecast specification form one unit;
- all option questions for one categorical forecast specification form one unit; and
- each question template together with all of its variables and allowed values is one additional unit.

A scalar, categorical, or template group is always selected as a whole, even if the user names only part of it. Several independent forecast specifications create several selectable units. A new-event draft must expose at least three distinct selectable units; questions grouped inside one scalar or categorical unit do not satisfy that minimum.

## Tool output

`submit_drafted_questions` owns the user-facing Markdown: numbered unit headings, question bullets, separators, and the follow-up line. Organize the draft into units in drafting order, then call the tool once and present the complete returned Markdown with `---` between selectable units and before the follow-up. Translate renderer-generated English labels and other fixed UI text into the specification's locked language from `language_code`; preserve the questions, variable names/values, and follow-up content, and do not replace the rendered units or questions with a summary. Add a missing separator as presentation formatting only.

The tool also returns a stable `forecast_specification_id` in structured content. Preserve it
when the user selects a unit and pass it first to `submit_selected_unit` and
`approve_forecast_specification`, then carry it into `submit_defined_terms`; do not
show the raw structured payload merely to expose the identifier.

Use these unit shapes:

- Binary: `{ "type": "binary", "question": "<question>" }`
- Scalar: `{ "type": "scalar", "questions": ["<question>", "..."] }`
- Categorical: `{ "type": "categorical", "questions": ["<question>", "..."] }`
- Template: `{ "type": "template", "question": "Will the museum's dinosaur exhibition remain open through <date>?", "variables": [{ "name": "date", "values": ["August 25", "August 31"] }] }` (only when one official calendar and the same rule cover both dates)

For a template, preserve the exact placeholder spelling between `question` and each variable `name`: `<date>` maps to `"name": "date"`. Variable names and values must be unique as described above.

The required `followUp` must refer to selectable unit numbers, not the raw number of questions. For the new-event draft, ask which unit number (for example, "1, 2, or 3") to use or how the alternatives should be revised. Its next-step hint must identify `define-terms` as the immediate next stage.

Do not paraphrase, renumber, or change the order of content returned by `submit_drafted_questions`. The only permitted formatting addition is an omitted `---` separator between units or before the follow-up.

## Selection guard and stop rule

The message may select or confirm questions from a prior draft, for example:

- "I'll take Unit 2";
- "Unit 4";
- "let's go with the second one";
- "I'll take the categorical set";
- "use the template forecast specification"; or
- a list of finished questions.

When it does, do not generate or restate questions and do not call
`submit_drafted_questions`. First call `submit_selected_unit` with the exact
selected unit, its unit number, and the carried `forecast_specification_id` when available.
Because the user's message is an explicit selection, immediately call
`approve_forecast_specification` with `stage: "selected_unit"` and the same identifier.
Only after that approval succeeds, hand the exact selected unit to
`define-terms`; do not call `submit_defined_terms` before the selected unit is
explicitly approved. For a selected `alternative_forecast_specification`, start a separate
record by submitting and approving its new selected unit, then run
`define-terms`, omitting the original forecast specification ID.

If the message is too vague to identify a specific event, threshold, or time period, ask the user to clarify rather than guessing. Do not call `submit_drafted_questions` in that case.

## Examples

"Where will Bitcoin's USD price be on November 26, 2026?" can be decomposed into one direct scalar unit:

- Will Bitcoin's USD price be below $60k on November 26, 2026?
- Will Bitcoin's USD price be at least $60k but below $100k on November 26, 2026?
- Will Bitcoin's USD price be $100k or higher on November 26, 2026?

Do not combine the below-$60k and at-least-$100k questions with `<comparator>` or
`<price>` placeholders: those substitutions change the qualifying condition.
Keep the scalar questions as the exact range group. A separate date template is
appropriate only if multiple concrete dates were supplied and the same USD price
source and observation procedure apply to each date.

That direct scalar unit is only one of the selectable units required in the
first workflow step. Add at least two distinct, intent-preserving alternatives
(for example, a close reformulation or a measurable proxy) before submission.

"How many rate cuts will the Fed make in 2026?" can be decomposed into one scalar unit:

- Will the Fed make 0 rate cuts in 2026?
- Will the Fed make exactly 1 rate cut in 2026?
- Will the Fed make exactly 2 rate cuts in 2026?
- Will the Fed make 3 or more rate cuts in 2026?
