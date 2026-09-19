---
name: define-resolution-source
description: Identify and register independent authoritative resolution sources for a selected forecast specification unit after its terms are agreed.
---

# Define resolution sources

Read [references/source-spec.md](references/source-spec.md) before research. It
is the sole source for coverage, independence, template, locator, and fallback
rules.

1. Require one exact selected unit with approved definitions.
2. Research the complete hierarchy and any gaps or alternative internally.
3. Call `submit_resolution_source` once and present its complete rendered
   review; there is no separate source-proposal stage.
4. Resubmit the full hierarchy after changes. Only after explicit approval,
   approve `resolution_sources` and continue with
   `define-resolution-criteria`.

Follow the server-wide rules for language, internal metadata, rendering,
separate alternative records, and approvals.
