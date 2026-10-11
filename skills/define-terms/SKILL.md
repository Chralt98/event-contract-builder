---
name: define-terms
description: Identify genuinely ambiguous terms in a forecast specification and propose precise definitions.
---

# Define terms

Read [references/definition-spec.md](references/definition-spec.md) before
analysis. It is the sole source for ambiguity and definition rules.

1. Analyze the complete forecast specification without rewriting it. Ask the user only when
   materially different defensible definitions require their choice.
2. For an existing specification, use `next_stage_bindings` from the approval
   or stage handoff when supplied; do not reopen the prior stage or fetch Terms
   again. If bindings are unavailable, fetch `defined_terms` once after
   completing the analysis. Then call `submit_defined_terms` once, including an
   empty map when nothing needs definition. The submission opens Terms with the
   completed draft. Use its response as the updated review; do not resubmit to
   inspect it.
3. After explicit approval, follow the server-wide
   [approval routing](../../src/foresight/instructions.md#workflow-state). Run
   any required post-approval review against the exact approved revision before
   continuing with `define-resolution-source`.

Follow the server-wide language, metadata, rendering,
record, and approval rules.
