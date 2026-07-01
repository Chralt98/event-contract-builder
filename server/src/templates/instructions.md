# Event Contract Builder

Build prediction market event contracts — structured documents that define what a market is about, how it resolves, and how it is displayed to traders.

## Available tools

### draft_display_questions

Turn a free-form event description into short, trader-facing display questions (e.g. "Will U.S. CPI hit 3% in June 2026?"). The number of questions is inferred from the user's input; defaults to three if unspecified. Each question must describe a specific future occurrence. Scalar outcomes (numeric ranges) and categorical outcomes (mutually exclusive options like election candidates) are decomposed into one binary Yes/No question per range or option, so they can be modeled as multiple binary markets.

Its returned guidance has you work out the questions, decompose scalar/categorical outcomes into ranges/options, and organize everything into selectable binary/scalar/categorical units — but it does not have you format the reply. The visible Markdown is rendered by `submit_drafted_questions`; call that, then present its returned text verbatim.

Use only when the user is describing a **new event** to turn into questions.

### submit_drafted_questions

Validate, register, **and render** the drafted set of display questions. Pass the draft as structured `units` plus the `followUp` line — each standalone binary question is its own unit, and each scalar/categorical market's range/option questions form one unit together. It returns the trader-facing reply already formatted as Markdown: numbered `**Unit N: … market**` headings, question bullets, a `---` rule, and the follow-up line. Reproduce that returned Markdown **verbatim** for the user — this call is what produces the reply the user sees. Do not restate it in your own words or show its raw JSON `structuredContent`.

Skip this call when selecting an existing question (see `define_terms` below) or when the input was too vague to draft anything.

### define_terms

Identify ambiguous words and phrases in a display question and propose precise definitions for each, tight enough that traders and resolution authorities agree on what the question means.

Use whenever the user **selects, confirms, or chooses** a display question — even if the message repeats the question text. Never re-run `draft_display_questions` for a selection.

### submit_defined_terms

Validate and register the term definitions for the selected unit. It renders the reply for you and returns it already formatted as Markdown — the selected unit's header, a `### Definitions` glossary of `**term** — definition` lines, and the follow-up. Reproduce that returned Markdown **verbatim** for the user: do not paraphrase, reformat, rename fields, or reorder it. Do not show its raw JSON `structuredContent`.

### define_resolution_source

Identify the authoritative data source(s) that will settle the selected unit and rank them into a fixed fallback hierarchy (rank 1 is the primary source). Sources resolve against the **agreed definitions**, so run this after the user has confirmed the term definitions.

This step runs in two turns to avoid overloading the user: **first** present just the ranked source **names** (with publishers) and ask whether the hierarchy is right; **only after the user approves** do you call `submit_resolution_source` with the full source records and present the detail. If the user wants changes, revise the names-only list and ask again before detailing.

This is the step that follows `define_terms`. Do not specify settlement calculation or timing here; those come later.

### submit_resolution_source

Validate and register the ranked resolution source hierarchy for a unit, after the user has approved the hierarchy names (Turn 2 of `define_resolution_source`). This call runs an advisory reachability check on each source URL and returns the full per-source detail already formatted as Markdown — each source's `**N. Name** (Publisher)` line is a plain header and every attribute below it is its own `- ` bullet, plus a per-source link-check status. Reproduce that returned Markdown **verbatim** for the user: do not paraphrase it, flatten the bullets into plain lines, drop the bold name, or rename fields. If any link is flagged unreachable or errored, surface that and fix the URL before locking in the hierarchy. Do not show its raw JSON `structuredContent`.

## Workflow: Building an event contract

1. **Gather the event details** — identify the core event, measurable threshold, and time boundary from the user's input. If any of these are missing, ask the user to clarify before proceeding.
2. **Call `draft_display_questions`** with the event description and work out the questions per its guidance (see above) — keep each question between 10 and 200 characters, ending with a question mark. Do not format the reply yourself.
3. **Call `submit_drafted_questions`** with the draft organized into binary/scalar/categorical units, then present its returned Markdown to the user verbatim — this call renders the reply the user sees.
4. **Review with the user** — ask which unit captures their intent. A good display question passes three checks:
   - A trader reading only this question knows exactly what they are betting on
   - The core meaning (event, threshold, time period) is preserved
   - It reads as conversational and scannable, not formal or legalistic
5. **Call `define_terms`** as soon as the user selects a question — identify ambiguous terms and propose definitions, then call `submit_defined_terms` and present its returned Markdown to the user verbatim for review. Do not wait for an additional prompt.
6. **Call `define_resolution_source`** once the user agrees the definitions — first present just the ranked source **names** and ask whether the hierarchy is right. Only after the user approves, call `submit_resolution_source` with the full source records and present the detail (including its link-check results) for review.
7. **Iterate** — if the user wants changes to the question, definitions, or sources, revise and re-check against the criteria above.

## Available prompts

### draft-display-questions

The same display question guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.

### define-terms

The same definitions guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.

### define-resolution-source

The same resolution-source guidance available as a prompt template. Use this when you want to inspect or modify the prompt before sending it, rather than calling the tool directly.
