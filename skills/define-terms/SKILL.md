---
name: define-terms
description: Identify genuinely ambiguous terms in a forecast specification and propose precise definitions.
---

# Define terms

Read [references/definition-spec.md](references/definition-spec.md) before
analysis. It is the sole source for ambiguity and definition rules.

1. Analyze the complete forecast specification without rewriting it. Ask the user only when
   materially different defensible definitions require their choice.
2. For an existing specification, fetch `defined_terms` once with
   `get_forecast_stage_review` immediately before submission to obtain current
   bindings. Then call `submit_defined_terms` once, including an empty map when
   nothing needs definition. Use its response as the updated review and follow
   the shared presentation rules; do not resubmit to inspect the same result.
3. After explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state). Run
   any required post-approval review against the exact approved revision before
   continuing with `define-resolution-source`.

Follow the server-wide language, metadata, rendering,
record, and approval rules.
