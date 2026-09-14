# Resolution language

Resolution rules are intentionally open text. The schema does not impose a
closed list of event types, comparators, calculations, classifications, or
settlement mechanisms because real-world forecast questions can require many
different kinds of observable logic.

## Forecast specifications

The Foresight workflow stores one rule for every binary question represented by
the selected unit:

- a binary unit has one rule;
- a scalar or categorical unit has one rule per question in its question set;
- a template unit has one rule for its placeholder-bearing question and the
  rule covers every allowed substitution.

Each rule states when the exact question resolves Yes and when it resolves No.
Shared text describes the evidence and approved-source handling, followed by
relevant exception and unresolved-outcome rules. The question-specific text may
use any precise method appropriate to the approved question and sources.

## Full event-contract specifications

The full contract schema uses `resolution.resolutionRule` for its single
contract-level resolution rule. Timing, sources, evidence, fallback, and other
settlement controls remain separate fields because they govern how the rule is
applied, not what mathematical or factual mechanism the question uses.

## Contingencies

Contingency statements use a small deterministic renderer because the
all-of/any-of control flow and unmet disposition are fixed schema concepts.
`renderContingencyStatement()` produces the corresponding statement from the
contingency fields. This renderer does not restrict the primary resolution rule.

## Precise authoring

Open text does not mean discretionary text. A useful authoring test is:

> Could a settlement clerk with no market context apply the rule using only the
> approved question, definitions, sources, and stated deadlines?

If the answer is no, add the missing observable, boundary, source procedure,
or exception to the appropriate rule text.
