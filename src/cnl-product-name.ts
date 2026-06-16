/**
 * Controlled Natural Language — product-name question renderer
 * ============================================================
 *
 * Trader-facing contract names are questions rendered deterministically from
 * structured template slots. `renderProductName()` is the single source of
 * truth; `meta.productName.displayName` is validated against its output so
 * prose and machine-readable fields can never diverge.
 */

/** Closed vocabulary for numeric comparators in product-name questions. */
export const NUMERIC_COMPARATOR_PHRASES: Record<string, string> = {
  above: "above",
  below: "below",
  "at-least": "at least",
  "at-most": "at most",
  exactly: "exactly",
};

/**
 * Trader-facing question templates for the five product-name families.
 * Placeholders use {UPPER_SNAKE} so they are visually distinct from prose.
 */
export const PRODUCT_NAME_TEMPLATES = {
  /** "Will Kansas City Chiefs win the 2027 Super Bowl?" */
  "binary-event": "Will {SUBJECT} {VERB_PHRASE}?",
  /** "Will Elon Musk join the Fed before January 20, 2027?" */
  "binary-event-with-date": "Will {SUBJECT} {VERB_PHRASE} {PREPOSITION} {DATE}?",
  /** "Will GDP be above 3%?" */
  "numeric-threshold": "Will {METRIC} be {COMPARATOR} {VALUE}{UNIT_SUFFIX}?",
  /** "Will CPI be between 2.5% and 3.0%?" */
  "numeric-range": "Will {METRIC} be between {LOWER} and {UPPER}{UNIT_SUFFIX}?",
  /** "Which candidate will have the largest margin of victory in the 2026 US Senate race?" */
  "selection-winner-with-context":
    "Which {ENTITY_TYPE} will {WIN_CONDITION} in {CONTEXT}?",
  /** "Which team will win the 2027 Super Bowl?" */
  "selection-winner": "Which {ENTITY_TYPE} will {WIN_CONDITION}?",
  /** "What will the price of Bitcoin be on January 1, 2027?" */
  "open-numeric": "What will {METRIC} be {PREPOSITION} {DATE}?",
  /** "Will all three of [A, B, C] occur in the 2026 elections?" */
  "compound-event-set-with-context": "Will {OUTCOMES} occur in {EVENTS}?",
  /** "Will all three of [A, B, C] occur?" */
  "compound-event-set": "Will {OUTCOMES} occur?",
} as const;

/**
 * Structural description of a product name — the machine-readable fields that
 * `renderProductName` turns into a `displayName` question string.
 */
export type ProductNameStructureT =
  | { template: "binary-event"; subject: string; verbPhrase: string }
  | {
      template: "binary-event-with-date";
      subject: string;
      verbPhrase: string;
      preposition: "before" | "by" | "on";
      date: string;
    }
  | {
      template: "numeric-threshold";
      metric: string;
      comparator: "above" | "below" | "at-least" | "at-most" | "exactly";
      value: number;
      unit: string;
    }
  | {
      template: "numeric-range";
      metric: string;
      lower: number;
      upper: number;
      unit: string;
    }
  | {
      template: "selection-winner";
      entityType: string;
      winCondition: string;
      context?: string;
    }
  | {
      template: "open-numeric";
      metric: string;
      preposition: "before" | "on";
      date: string;
    }
  | {
      template: "compound-event-set";
      outcomes: string;
      events?: string;
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

/**
 * Deterministically render a trader-facing question string from the structured
 * product-name fields. `meta.productName.displayName` must equal this output.
 */
export function renderProductName(s: ProductNameStructureT): string {
  switch (s.template) {
    case "binary-event":
      return PRODUCT_NAME_TEMPLATES["binary-event"]
        .replace("{SUBJECT}", s.subject)
        .replace("{VERB_PHRASE}", s.verbPhrase);

    case "binary-event-with-date":
      return PRODUCT_NAME_TEMPLATES["binary-event-with-date"]
        .replace("{SUBJECT}", s.subject)
        .replace("{VERB_PHRASE}", s.verbPhrase)
        .replace("{PREPOSITION}", s.preposition)
        .replace("{DATE}", s.date);

    case "numeric-threshold": {
      const comparatorPhrase = phraseFor(
        NUMERIC_COMPARATOR_PHRASES,
        s.comparator,
        "numeric comparator",
      );
      const unitSuffix = s.unit ? ` ${s.unit}` : "";
      return PRODUCT_NAME_TEMPLATES["numeric-threshold"]
        .replace("{METRIC}", s.metric)
        .replace("{COMPARATOR}", comparatorPhrase)
        .replace("{VALUE}", String(s.value))
        .replace("{UNIT_SUFFIX}", unitSuffix);
    }

    case "numeric-range": {
      const unitSuffix = s.unit ? ` ${s.unit}` : "";
      return PRODUCT_NAME_TEMPLATES["numeric-range"]
        .replace("{METRIC}", s.metric)
        .replace("{LOWER}", String(s.lower))
        .replace("{UPPER}", String(s.upper))
        .replace("{UNIT_SUFFIX}", unitSuffix);
    }

    case "selection-winner":
      if (s.context) {
        return PRODUCT_NAME_TEMPLATES["selection-winner-with-context"]
          .replace("{ENTITY_TYPE}", s.entityType)
          .replace("{WIN_CONDITION}", s.winCondition)
          .replace("{CONTEXT}", s.context);
      }
      return PRODUCT_NAME_TEMPLATES["selection-winner"]
        .replace("{ENTITY_TYPE}", s.entityType)
        .replace("{WIN_CONDITION}", s.winCondition);

    case "open-numeric":
      return PRODUCT_NAME_TEMPLATES["open-numeric"]
        .replace("{METRIC}", s.metric)
        .replace("{PREPOSITION}", s.preposition)
        .replace("{DATE}", s.date);

    case "compound-event-set":
      if (s.events) {
        return PRODUCT_NAME_TEMPLATES["compound-event-set-with-context"]
          .replace("{OUTCOMES}", s.outcomes)
          .replace("{EVENTS}", s.events);
      }
      return PRODUCT_NAME_TEMPLATES["compound-event-set"].replace(
        "{OUTCOMES}",
        s.outcomes,
      );
  }
}
