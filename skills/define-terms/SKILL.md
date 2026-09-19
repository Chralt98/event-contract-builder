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
3. Call `submit_defined_terms` once, including an empty map when nothing needs
   definition, and present the complete rendered review.
4. After explicit approval, approve `defined_terms` and continue with
   `define-resolution-source`.

For a selected alternative, use its exact new unit, start definitions from
scratch, and keep its candidate sources provisional. Follow the server-wide
language, metadata, rendering, record, and approval rules.
