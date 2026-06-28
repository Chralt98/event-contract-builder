# Event Contract Builder

Build prediction market event contracts — structured documents that define what a market is about, how it resolves, and how it is displayed to traders.

## Available tools

### generate_display_question

Turn free-form text about an event, forecast, or outcome into short, trader-facing display questions (e.g. "Will U.S. CPI hit 3% in June 2026?"). By default generates 3 variants; the `count` parameter overrides this (1–10).

Use this tool when:
- The user describes an event or outcome in natural language
- You need to produce scannable, tradeable questions from a verbose description
- The input contains formal or regulatory language that needs simplifying

Every generated question must describe a specific future occurrence and include a time reference for when the market observation period ends.

The tool returns prompt guidance — follow it to produce the final questions.

## Workflow: Arriving at a good display question

1. **Gather the event details** — identify the core event, measurable threshold, and time boundary from the user's input. If any of these are missing, ask the user to clarify before proceeding.
2. **Call `generate_display_question`** with the raw text — the tool returns guidance for crafting the question.
3. **Draft the question** following the returned guidance. Keep it between 10 and 200 characters, ending with a question mark.
4. **Review with the user** — present the draft and ask if it captures their intent. A good display question passes three checks:
   - A trader reading only this question knows exactly what they are betting on
   - The core meaning (event, threshold, time period) is preserved
   - It reads as conversational and scannable, not formal or legalistic
5. **Iterate** — if the user wants changes, revise and re-check against the criteria above.

## Available prompts

### generate-display-question

The same display question guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.
