/**
 * Deterministic renderer for contingency statements.
 *
 * Primary resolution rules are intentionally open text. Only contingency
 * dispositions use this fixed renderer because they describe one common
 * contract-level control flow.
 */

const UNMET_DISPOSITION_PHRASES: Record<string, string> = {
  "void-and-refund":
    "is voided and all positions are refunded at acquisition price",
  "resolve-no": "resolves NO",
  "exchange-determination-per-rulebook":
    "is resolved by exchange determination under the rulebook",
};

const CONTINGENCY_TEMPLATES = {
  allOf:
    "This contract's primary resolution rule applies only if all of the conditions listed in section contingency hold by their stated evaluation deadlines; otherwise the contract {DISPOSITION}.",
  anyOf:
    "This contract's primary resolution rule applies only if at least one of the conditions listed in section contingency holds by its stated evaluation deadline; otherwise the contract {DISPOSITION}.",
} as const;

/** Structural type so this module needs no runtime import from the schema. */
export interface ContingencyLike {
  mode: "all-of" | "any-of";
  ifUnmet: keyof typeof UNMET_DISPOSITION_PHRASES | string;
}

function dispositionPhrase(key: string): string {
  const phrase = UNMET_DISPOSITION_PHRASES[key];
  if (phrase === undefined) {
    throw new Error(`Unsupported unmet disposition: ${key}`);
  }
  return phrase;
}

/** Deterministically render the contingency statement. */
export function renderContingencyStatement(c: ContingencyLike): string {
  const template =
    c.mode === "all-of"
      ? CONTINGENCY_TEMPLATES.allOf
      : CONTINGENCY_TEMPLATES.anyOf;
  return template.replace("{DISPOSITION}", dispositionPhrase(c.ifUnmet));
}
