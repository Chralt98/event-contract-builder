---
name: define-terms
description: Identify genuinely ambiguous terms in a selected forecast specification unit and propose precise definitions; use only after a user selects or confirms an existing unit.
---

# Define terms

Read [references/definition-spec.md](references/definition-spec.md) before
analysis. It is the sole source for ambiguity and definition rules.

1. Require one exact, already approved selected unit and its unit number.
2. Analyze the complete unit without rewriting it. Ask the user only when
   materially different defensible definitions require their choice.
3. For an existing specification, fetch `defined_terms` once with
   `get_forecast_stage_review` immediately before submission to obtain current
   bindings. Then call `submit_defined_terms` once, including an empty map when
   nothing needs definition. Use its response as the updated review and follow
   the shared presentation rules; do not resubmit to inspect the same result.
4. After explicit approval, approve `defined_terms`. Then run the server-wide
   post-approval review for that exact revision before continuing with
   `define-resolution-source`.

For an alternative selected from a draft, use its exact unit and start
definitions from scratch. Follow the server-wide language, metadata, rendering,
record, and approval rules.
