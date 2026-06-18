# event-contract-builder

A TypeScript library, CLI, and MCP server for generating, validating, and converting YAML and JSON event contract specifications for prediction markets.

## Status

This package is in early development. The public API may change before v1.0.0.

The library entry point is available through the package root after building:

```sh
bun run build
```

## Installation

```sh
npm install event-contract-builder
```

## Quick usage

### 1. Render a product name from structured template slots

Every contract has a trader-facing product name rendered deterministically from a template. The structured fields are the source of truth; the `displayName` string must match the render output.

```ts
import { renderProductName } from "event-contract-builder";

const structure = {
  template: "numeric-threshold" as const,
  metric: "CPI YoY",
  comparator: "at-least" as const,
  value: 3,
  unit: "percent",
};

const displayName = renderProductName(structure);
// → "Will CPI YoY be at least 3 percent?"
```

Available templates:

| Template                  | Example output                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| `binary-event`            | Will Kansas City Chiefs win the 2027 Super Bowl?                      |
| `binary-event-with-date`  | Will Elon Musk join the Federal Reserve Board before January 20, 2027?|
| `numeric-threshold`       | Will GDP growth be above 3 percent?                                   |
| `numeric-range`           | Will CPI YoY be between 2.5 and 3 percent?                           |
| `selection-winner`        | Which team will win the 2027 Super Bowl?                              |
| `open-numeric`            | What will the price of Bitcoin be on January 1, 2027?                 |
| `compound-event-set`      | Will all three of [A, B, C] occur in the 2026 elections?              |

### 2. Build and validate a full contract spec

A complete spec includes meta (with product name), underlying event, outcome, trading parameters, resolution, payout, integrity assessment, and compliance posture. The `canonicalStatement` is rendered from structured resolution fields — hand-written statements that drift from the structured terms fail validation.

```ts
import {
  EventContractSpec,
  renderCanonicalStatement,
  renderProductName,
  type EventContractSpecT,
} from "event-contract-builder";

const productNameStructure = {
  template: "numeric-threshold" as const,
  metric: "CPI YoY",
  comparator: "at-least" as const,
  value: 3,
  unit: "percent",
};

const spec: EventContractSpecT = {
  dsl: "event-contract-cnl/0.1",
  meta: {
    ticker: "CPI-26JUN-T3.0",
    productName: {
      structure: productNameStructure,
      displayName: renderProductName(productNameStructure),
    },
    title: "CPI Year-over-Year Rate >= 3.0% (June 2026)",
    category: "economic-indicator",
    specVersion: "1.0.0",
    status: "draft",
    lastUpdated: "2026-06-18",
    authors: ["Product Team"],
  },
  underlying: {
    eventDefinition:
      "The U.S. Consumer Price Index for All Urban Consumers year-over-year percent change for the reference month of June 2026.",
    commodityClassification: {
      hypothesis: "excluded-commodity",
      rationale:
        "CPI is an occurrence beyond the parties' control with clear economic consequence, fitting CEA section 1a(19)(iv).",
    },
    underlyingMarketDescription:
      "The CPI is published monthly by the U.S. Bureau of Labor Statistics. It measures the average change over time in prices paid by urban consumers for a market basket of consumer goods and services. It is widely followed as the primary gauge of U.S. consumer inflation.",
    enumeratedActivityScreen: {
      activities: {
        unlawfulUnderFederalOrStateLaw: { settlementDeterminedByActivity: false, note: "" },
        terrorism:     { settlementDeterminedByActivity: false, note: "" },
        assassination: { settlementDeterminedByActivity: false, note: "" },
        war:           { settlementDeterminedByActivity: false, note: "" },
        gaming:        { settlementDeterminedByActivity: false, note: "" },
        commissionDesignatedSimilarActivity: { settlementDeterminedByActivity: false, note: "" },
      },
      settlementOccurrenceAnalysis:
        "Settlement is determined by the value of a government-published economic indicator, which is a lawful measurement activity.",
      anyEnumeratedActivityInvolved: false,
    },
  },
  outcome: { type: "binary", values: ["Yes", "No"] },
  trading: {
    quotation: "cents-0-100",
    minTick: 1,
    tradingHours: "08:00-22:00 America/New_York, Mon-Fri",
    lastTradingTime: "2027-01-15T16:00:00-05:00",
    positionLimits: { mode: "position-limit", contracts: 25000 },
    settlementTiming:
      "Settlement occurs within two business days after final resolution is confirmed.",
  },
  resolution: {
    criterion: {
      kind: "threshold",
      metric: {
        name: "US CPI year-over-year rate",
        unit: "percent",
        extraction:
          "Read the annual percent change from the CPI-U all-items series (CUSR0000SA0) in the BLS CPI Summary table.",
        revisionPolicy: "first-published-value",
      },
      comparator: "greater-than-or-equal",
      threshold: 3,
    },
    canonicalStatement: "", // filled below by renderCanonicalStatement
    observationWindow: {
      start: "2026-01-01T00:00:00Z",
      end: "2026-12-31T23:59:59Z",
      timezone: "UTC",
    },
    sources: [
      {
        id: "bls-cpi",
        name: "Consumer Price Index",
        publisher: "U.S. Bureau of Labor Statistics",
        url: "https://www.bls.gov/cpi/",
        datasetId: "CUSR0000SA0",
        publicationSchedule: "Published monthly, typically around the 10th-14th of the following month.",
        publiclyAccessible: true,
        independenceNote:
          "The BLS is a principal federal statistical agency independent of market participants.",
      },
    ],
    primarySourceId: "bls-cpi",
    fallbacks: [],
    resolutionDeadline: "2027-01-31T23:59:59Z",
    earlyResolution: { allowed: false },
    terminalAmbiguityPolicy: "void-and-refund",
    edgeCases: [
      {
        scenario: "If the BLS retracts the first published value before the resolution deadline.",
        disposition: "Use the corrected value published before the resolution deadline.",
      },
      {
        scenario: "If no CPI value is published before the resolution deadline.",
        disposition: "Apply the terminal ambiguity policy and void the contract.",
      },
      {
        scenario: "If the BLS renames the CPI series without changing methodology.",
        disposition: "Use the renamed successor series as the primary data source.",
      },
    ],
    disputeWindowHours: 24,
  },
  payout: {
    type: "binary",
    currency: "USD",
    contractSize: 1,
    yesPays: 1,
    noPays: 0,
  },
  integrity: {
    outcomeInfluenceAnalysis:
      "The CPI is computed from tens of thousands of sampled prices. No single participant can meaningfully influence the aggregate index.",
    informationAsymmetryAnalysis:
      "BLS employees are subject to federal confidentiality requirements. No private party receives advance access.",
    sourceRobustnessAnalysis:
      "The CPI has been published continuously since 1913 with publicly documented methodology resistant to short-term manipulation.",
    surveillanceConsiderations: [
      "Monitor for unusual position-building before CPI release dates.",
      "Watch for correlated trading across CPI-linked contracts on multiple venues.",
    ],
    overallSusceptibility: "low",
    mitigations: [],
  },
  compliance: {
    intendedVenue: "cftc-designated-contract-market",
    anticipatedListingPath: "part-40.2-self-certification",
    draftDisclaimer:
      "DRAFT for internal and counsel review only. Not a CFTC filing, not a Part 40 self-certification, and not legal advice.",
    openQuestionsForCounsel: [
      "Confirm excluded-commodity classification under CEA section 1a(19)(iv).",
    ],
    reviewedAgainst: ["17 CFR Part 38 Appendix C", "CEA 5c(c)(5)(C)"],
  },
};

// Render the canonical statement and validate the full spec
const canonicalStatement = renderCanonicalStatement(spec);
const validated = EventContractSpec.parse({
  ...spec,
  resolution: { ...spec.resolution, canonicalStatement },
});

console.log(validated.meta.productName.displayName);
// → "Will CPI YoY be at least 3 percent?"

console.log(validated.resolution.canonicalStatement);
// → "This contract resolves YES if US CPI year-over-year rate, as published by
//    U.S. Bureau of Labor Statistics (Consumer Price Index), measured over the
//    period from 2026-01-01T00:00:00Z to 2026-12-31T23:59:59Z (UTC), is greater
//    than or equal to 3 percent, applying the first published value as of the
//    resolution deadline; otherwise it resolves NO."
```

## Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md) for important information about the legal and regulatory status of outputs produced by this tooling.

## License

Copyright © 2026 Christopher Maximilian Altmann. Licensed under the Apache License, Version 2.0.
