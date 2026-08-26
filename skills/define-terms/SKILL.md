---
name: define-terms
description: Identify genuinely ambiguous terms in a selected prediction-market unit and propose precise definitions; use only after a user selects or confirms an existing unit.
---

# Purpose

Use this skill after a user selects, confirms, or chooses a display-question unit from an existing draft. It expects the selected unit and its 1-based unit number, and produces a glossary of only the terms that need clarification.

Read [references/definition-spec.md](references/definition-spec.md) before analyzing a unit. It contains the ambiguity criteria, exclusions, definition rules, and `submit_defined_terms` contract.

## Workflow

1. Confirm that the input identifies exactly one unit. If the unit number or selected unit is missing or ambiguous, ask for clarification and stop. A scalar, categorical, or template selection always means the complete group, including every template variable and value.
2. Analyze the exact selected unit for terms that a trader or resolution authority could reasonably interpret in more than one way.
3. Propose concise, dispute-resistant definitions without rewriting the selected questions.
4. Call `submit_defined_terms` once with the unit number, exact selected unit, definitions map, and a follow-up asking whether the definitions should be changed.
5. Present the tool's complete returned Markdown verbatim and nothing else. It is
   the user-facing glossary: include every term, its definition, and the
   follow-up. Never replace it with a confirmation or the follow-up alone.

The selected unit is supplied directly to this skill by the host workflow. Do not call a separate prompt-returning tool; the only MCP call in this workflow is `submit_defined_terms`.

## Boundaries

- Do not define obvious words or invent missing facts, data sources, authorities, reporting entities, deadlines, or observation periods.
- Do not rewrite, narrow, or otherwise modify the selected question(s), template placeholders, variables, or allowed values.
- Do not use this skill to draft new display questions; route new-event requests to `draft-display-question`.
- Do not call `submit_defined_terms` when the selected unit is unclear; ask for clarification when necessary. If no genuine ambiguity exists, submit an empty definitions map so the tool can render that result.
