# Event Contract Builder

Build prediction market event contracts — structured documents that define what a market is about, how it resolves, and how it is displayed to traders.

## Available tools

### draft_display_questions

Turn a free-form event description into short, trader-facing display questions (e.g. "Will U.S. CPI hit 3% in June 2026?"). The number of questions is inferred from the user's input; defaults to three if unspecified. Each question must describe a specific future occurrence. Scalar outcomes (numeric ranges) and categorical outcomes (mutually exclusive options like election candidates) are decomposed into one binary Yes/No question per range or option, so they can be modeled as multiple binary markets.

Its returned guidance has you compose your reply to the user as Markdown: standalone binary questions as plain lines, but each scalar or categorical market's range/option questions grouped under a bold `**Scalar market**` / `**Categorical market**` heading. **Reply with that grouped Markdown, exactly as the guidance specifies** — never collapse a scalar/categorical group into an unlabeled flat list of lines; that hides which questions belong to the same market and makes the required follow-up line ("use this market...") ambiguous.

Use only when the user is describing a **new event** to turn into questions.

### submit_drafted_questions

Validate and register the same drafted set of display questions, organized into binary/scalar/categorical units, after you have already presented them to the user. Pass the same draft as structured `units` plus the `followUp` line — each standalone binary question is its own unit, and each scalar/categorical market's range/option questions form one unit together. This call is for registration only; do not show its raw JSON result to the user or restate its text — the user already saw the grouped Markdown from `draft_display_questions`.

Skip this call when selecting an existing question (see `define_question_terms` below) or when the input was too vague to draft anything.

### define_question_terms

Identify ambiguous words and phrases in a display question and propose precise definitions for each, tight enough that traders and resolution authorities agree on what the question means.

Use whenever the user **selects, confirms, or chooses** a display question — even if the message repeats the question text. Never re-run `draft_display_questions` for a selection.

## Workflow: Building an event contract

1. **Gather the event details** — identify the core event, measurable threshold, and time boundary from the user's input. If any of these are missing, ask the user to clarify before proceeding.
2. **Call `draft_display_questions`** with the event description, then reply to the user with the grouped Markdown draft per its guidance (see above) — keep each question between 10 and 200 characters, ending with a question mark.
3. **Call `submit_drafted_questions`** with the same draft organized into binary/scalar/categorical units, to validate and register the structured draft. Do not show its result to the user.
4. **Review with the user** — ask which unit captures their intent. A good display question passes three checks:
   - A trader reading only this question knows exactly what they are betting on
   - The core meaning (event, threshold, time period) is preserved
   - It reads as conversational and scannable, not formal or legalistic
5. **Call `define_question_terms`** as soon as the user selects a question — identify ambiguous terms and propose definitions. Present them to the user for review. Do not wait for an additional prompt.
6. **Iterate** — if the user wants changes to the question or definitions, revise and re-check against the criteria above.

## Available prompts

### draft-display-questions

The same display question guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.

### generate-definitions

The same definitions guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.
