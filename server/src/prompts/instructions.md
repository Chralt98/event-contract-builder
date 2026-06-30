# Event Contract Builder

Build prediction market event contracts — structured documents that define what a market is about, how it resolves, and how it is displayed to traders.

## Available tools

### draft_display_questions

Turn a free-form event description into short, trader-facing display questions (e.g. "Will U.S. CPI hit 3% in June 2026?"). The number of questions is inferred from the user's input; defaults to three if unspecified. Each question must describe a specific future occurrence. Scalar outcomes (numeric ranges) and categorical outcomes (mutually exclusive options like election candidates) are decomposed into one binary Yes/No question per range or option, so they can be modeled as multiple binary markets.

Use only when the user is describing a **new event** to turn into questions.

### define_question_terms

Identify ambiguous words and phrases in a display question and propose precise definitions for each, tight enough that traders and resolution authorities agree on what the question means.

Use whenever the user **selects, confirms, or chooses** a display question — even if the message repeats the question text. Never re-run `draft_display_questions` for a selection.

## Workflow: Building an event contract

1. **Gather the event details** — identify the core event, measurable threshold, and time boundary from the user's input. If any of these are missing, ask the user to clarify before proceeding.
2. **Call `draft_display_questions`** with the event description — draft questions following the returned guidance. Keep each between 10 and 200 characters, ending with a question mark.
3. **Review with the user** — present the drafts and ask which one captures their intent. A good display question passes three checks:
   - A trader reading only this question knows exactly what they are betting on
   - The core meaning (event, threshold, time period) is preserved
   - It reads as conversational and scannable, not formal or legalistic
4. **Call `define_question_terms`** as soon as the user selects a question — identify ambiguous terms and propose definitions. Present them to the user for review. Do not wait for an additional prompt.
5. **Iterate** — if the user wants changes to the question or definitions, revise and re-check against the criteria above.

## Available prompts

### draft-display-question

The same display question guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.

### generate-definitions

The same definitions guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.
