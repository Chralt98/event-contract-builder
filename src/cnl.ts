/**
 * Controlled Natural Language (CNL) layer
 * =======================================
 *
 * The DSL's CNL has three rules (full grammar in docs/cnl-grammar.md):
 *
 *  R1. Closed comparator vocabulary — every comparison uses exactly one of
 *      the fixed phrases in COMPARATOR_PHRASES. No synonyms.
 *  R2. No hedging lexicon — sentences containing vague terms
 *      ("approximately", "significant", "reasonable", ...) are rejected
 *      at parse time by the CnlSentence schema.
 *  R3. Render, don't write — the trader-facing `canonicalStatement` is
 *      produced by `renderCanonicalStatement()` from structured fields.
 *      A hand-written statement that drifts from the structured terms
 *      fails validation.
 */

import type { EventContractSpecT } from "./schema/event-contract";

/** R1: the only legal English realizations of each comparator. */
export const COMPARATOR_PHRASES: Record<string, string> = {
  "greater-than": "is greater than",
  "greater-than-or-equal": "is greater than or equal to",
  "less-than": "is less than",
  "less-than-or-equal": "is less than or equal to",
  "equal-to": "is exactly equal to",
  "between-inclusive":
    "is greater than or equal to the lower bound and less than or equal to the upper bound of",
  occurs: "occurs",
  "does-not-occur": "does not occur",
};

/** Sentence templates (placeholders in braces). */
export const TEMPLATES = {
  binaryThreshold:
    "This contract resolves YES if {METRIC}, as published by {PUBLISHER} ({SOURCE}), measured over {WINDOW}, {COMPARATOR_PHRASE} {THRESHOLD} {UNIT}, applying the {REVISION_POLICY} as of the resolution deadline; otherwise it resolves NO.",
  binaryOccurrence:
    "This contract resolves YES if the following event {COMPARATOR_PHRASE} within {WINDOW}: {EVENT_CLAUSE} Otherwise it resolves NO.",
  rangeMembership:
    "This contract resolves to the single range outcome listed in section payout whose range contains the value of {METRIC}, as published by {PUBLISHER} ({SOURCE}), measured over {WINDOW}, applying the {REVISION_POLICY}; range lower bounds are inclusive and upper bounds are exclusive.",
} as const;

/** Fixed English realizations of contingency unmet-dispositions. */
export const UNMET_DISPOSITION_PHRASES: Record<string, string> = {
  "void-and-refund":
    "is voided and all positions are refunded at acquisition price",
  "resolve-no": "resolves NO",
  "resolve-to-floor": "settles at the floor value stated in section payout",
  "exchange-determination-per-rulebook":
    "is resolved by exchange determination under the rulebook",
};

const REVISION_POLICY_PHRASES: Record<string, string> = {
  "first-published-value": "first published value",
  "value-as-of-observation-time":
    "value displayed at the stated observation time",
  "final-revised-value": "final revised value",
};

function phraseFor(
  phrases: Record<string, string>,
  key: string,
  label: string,
): string {
  const phrase = phrases[key];
  if (phrase === undefined) {
    throw new Error(`Unsupported ${label}: ${key}`);
  }
  return phrase;
}

function windowPhrase(spec: EventContractSpecT): string {
  const w = spec.resolution.observationWindow;
  return `the period from ${w.start} to ${w.end} (${w.timezone})`;
}

/**
 * Deterministically render the canonical CNL statement for a spec.
 * Validators compare this to `resolution.canonicalStatement`.
 */
export function renderCanonicalStatement(spec: EventContractSpecT): string {
  const c = spec.resolution.criterion;
  const primary = spec.resolution.sources.find(
    (s) => s.id === spec.resolution.primarySourceId,
  )!;
  const W = windowPhrase(spec);

  switch (c.kind) {
    case "threshold": {
      const threshold =
        c.comparator === "between-inclusive"
          ? `the range [${c.threshold}, ${c.thresholdUpper}]`
          : String(c.threshold);
      return TEMPLATES.binaryThreshold
        .replace("{METRIC}", c.metric.name)
        .replace("{PUBLISHER}", primary.publisher)
        .replace("{SOURCE}", primary.name)
        .replace("{WINDOW}", W)
        .replace(
          "{COMPARATOR_PHRASE}",
          phraseFor(COMPARATOR_PHRASES, c.comparator, "comparator"),
        )
        .replace("{THRESHOLD}", threshold)
        .replace("{UNIT}", c.metric.unit)
        .replace(
          "{REVISION_POLICY}",
          phraseFor(
            REVISION_POLICY_PHRASES,
            c.metric.revisionPolicy,
            "revision policy",
          ),
        );
    }
    case "occurrence":
      return TEMPLATES.binaryOccurrence
        .replace(
          "{COMPARATOR_PHRASE}",
          phraseFor(COMPARATOR_PHRASES, c.comparator, "comparator"),
        )
        .replace("{WINDOW}", W)
        .replace("{EVENT_CLAUSE}", c.eventClause);
    case "range-membership":
      return TEMPLATES.rangeMembership
        .replace("{METRIC}", c.metric.name)
        .replace("{PUBLISHER}", primary.publisher)
        .replace("{SOURCE}", primary.name)
        .replace("{WINDOW}", W)
        .replace(
          "{REVISION_POLICY}",
          phraseFor(
            REVISION_POLICY_PHRASES,
            c.metric.revisionPolicy,
            "revision policy",
          ),
        );
  }
}
