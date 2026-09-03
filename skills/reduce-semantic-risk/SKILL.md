---
name: reduce-semantic-risk
description: Review or refine prediction-market questions and contract terms to bound semantic risk; use before trading or when auditing resolution rules, exceptions, and resolver discretion.
---

# Purpose

Make semantic risk bounded: make ordinary cases deterministic; expose exceptional cases before trading; minimise unilateral discretion; create explicit meta-rules for genuinely unforeseen events; and ensure that whatever discretion remains is governed by transparent evidence, conflicts rules, escalation, and finality.

## Method

1. Identify every interpretation, decision, or missing rule that could change the outcome, including relevant boundaries, inputs, source precedence, calculations, and timing.
2. Make the ordinary resolution path mechanical. Use observable conditions and explicit rules for units, thresholds, inclusivity, rounding, revisions, ties, and source priority wherever they matter.
3. Surface plausible exceptional cases before trading. Address only material cases, such as unavailable, delayed, revised, or conflicting data; source replacement; event cancellation or postponement; and changes to a named entity or authority.
4. Minimise unilateral discretion by replacing open-ended judgment with predefined triggers, evidence requirements, fallback order, and consequences.
5. For events that cannot reasonably be enumerated, add narrow meta-rules that state who may classify the event, what principles constrain the decision, which remedies are available and in what order, and how the decision must preserve the contract's stated economic intent.
6. Govern any remaining discretion with a published evidence record, conflict disclosure and recusal rules, an escalation path, decision deadlines, a bounded correction or appeal window, and a clear point of finality.
7. Present each unresolved issue with its semantic risk, the smallest proposed rule that bounds it, and any choice the user must make. Do not silently choose a policy that changes the market's exposure.

## Boundaries

- Do not claim that semantic risk can be eliminated; identify the bounded residual risk.
- Do not invent facts, sources, authorities, deadlines, or user preferences.
- Do not rewrite the market's intended economic exposure or approved source hierarchy without explicit user agreement.
- Do not add remote edge cases merely for completeness; prioritize cases that are plausible or outcome-determinative.
- Distinguish semantic robustness from legal or regulatory compliance; do not present this review as a legal conclusion.
