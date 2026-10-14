# Resolution-criteria validation

Run this semantic review on the single complete Resolution Criteria text after
the chat interview and before `submit_resolution_criteria`. Compare it with the
complete approved forecast question unit,
definitions, resolution deadline, and approved source hierarchy. Review meaning
and coverage; wording may vary, so do not require exact phrases, case, or regex
matches. The checklist below reviews content, not separate input fields. The
criteria text itself must follow the seven-part paragraph order in
[criteria-spec.md](criteria-spec.md), written as ordinary prose paragraphs
without headings or labels. This checklist is for the model's pre-submission
review only; do not include it in the submitted criteria text.

## Schema Order

- Confirm the opening paragraph states Yes first, then No,
  then the approved dispositions for insufficient evidence and clear reality
  that cannot fairly map to an outcome. No must require evidence that the Yes
  condition failed; missing or conflicting evidence alone is not No.
- Include a scope paragraph only when a material boundary needs definition,
  then provide the target and timing, sources, and method paragraphs in that
  order.
- Include a data versions paragraph only when source revisions, releases, or methodology
  could change the result. Include an exceptions paragraph when a material edge
  case needs an explicit disposition. Keep either paragraph in its fixed
  position.
- Use the question's wording to determine whether the target is a named
  source's publication, announcement, or decision, or the underlying event or
  value. If that distinction could change the outcome and the wording does not
  settle it, resolve the intent in the chat interview before submission.
- If the target is the underlying event or value, use approved sources as
  evidence under the approved hierarchy. Do not silently change the target,
  add a source, or use a fallback outside its approved trigger.
- Confirm the Yes and No outcomes are each determinable from approved evidence.
  No must not be the default merely because the Yes condition was not proved.
- Omit immaterial optional paragraphs and speculative edge cases. Do not append
  another No rule after the ordered sections.

## Outcome Rules

- Confirm the rule clearly says when the question or market resolves Yes. A
  natural equivalent of “This question resolves as Yes if …” is enough; do not
  require that lead-in verbatim.
- Confirm it identifies what the forecast question measures or the event it
  asks about, and faithfully includes its approved IF condition. A reasonable
  reader should be able to connect the condition to the question's subject,
  threshold, outcome, and time frame.
- Ground the Yes determination in the approved evidence and identify its
  approved source basis, for example, “according to [primary source]” or the
  approved source hierarchy. Name every approved source and its role in the
  complete text.
- State the approved deadline as a concrete date and, when specified or
  outcome-relevant, its exact time and time zone. A generic phrase such as “by
  the resolution deadline” does not identify the cutoff. Never invent a time
  or zone; if the missing precision could change the result, resolve it with the
  user before submission.
- State the No rule in the opening paragraph. The approved evidence
  must establish that the Yes condition was not met by the cutoff; do not use
  “otherwise” to turn missing proof into No. Explain material edge cases in the
  ordered text without adding a second No rule.
- For conditional questions, preserve the approved `ifUnmet` disposition. If
  it is a custom action or an equal 50/50 allocation, state that disposition
  precisely; do not replace it with an ordinary No complement.

## Resolution Sources

- Name the exact approved primary source for this question or market.
- Name every approved fallback in the same priority order, clearly identifying
  the first, second, and subsequent fallback sources. Preserve the approved
  hierarchy and its conditions for moving to a fallback; do not omit a source,
  introduce an unapproved one, or describe fallback sources as co-equal
  consensus unless that was approved.
- If the hierarchy has no fallback, do not imply one. Verify source names and
  roles against the approved source records, not memory or an external example.

## Resolution Method

Check that a resolver can follow the procedure without guessing. For each
approved source, describe how to reach the relevant website, report, account,
page, dataset, or record; where on it to look; which subject, measure, date,
geography, query, or aggregation to use; and how the observed evidence maps to
the Yes condition. State the order and trigger for using fallbacks, and explain
how to handle relevant corrections, revisions, publication times, or source
conflicts. Include only details supported by the approved source and settled
decisions; return material missing choices to the chat interview rather than
inventing a procedure.

## Exceptions and Unresolved Outcomes

- Check material edge cases that follow from this question and its sources:
  for example, unavailable, late, missing, corrected, or conflicting evidence;
  a canceled or postponed event; multiple or absent matches; or an assumption
  the criteria depend on becoming false. Do not add speculative cases that
  cannot affect resolution.
- Distinguish evidence that establishes No from evidence that is insufficient
  to determine Yes or No. Missing proof alone is not No.
- State the applicable disposition for unresolved evidence, such as Ambiguous,
  and for cases where reality is clear but the question cannot fairly map it to
  an outcome, such as Annulled. Do not invent platform scoring, refunds, or
  settlement policy.
- For conditional questions, make sure the selected unmet disposition is
  consistent with Outcome Rules and that unresolved condition evidence is not
  silently treated as unmet. State the specific custom action or 50/50
  allocation and explain its interaction with relevant edge cases and
  unresolved evidence in the same text.

## Review result

Treat each check above as semantic coverage, not a wording template. If the text
misses something recoverable from approved inputs, correct it before submission
and review it again for consistency. If a deadline, source priority,
condition, or disposition is not settled and could alter the result, return to
the relevant chat interview decision before submitting. Submit only when all four
content areas agree with each other and with the approved forecast specification.
