# event-contract-builder
A TypeScript library, CLI, and MCP server for generating, validating, and converting YAML and JSON event contract specifications for prediction markets.

## Status

This package is in early development. The public API may change before v1.0.0.

The library entry point is available through the package root after building:

```sh
bun run build
```

## Installation

npm install event-contract-builder

## Usage

Render a canonical statement from structured resolution fields:

```ts
import {
  EventContractSpec,
  renderCanonicalStatement,
  type EventContractSpecT,
} from "event-contract-builder";

const spec: EventContractSpecT = {
  dsl: "event-contract-cnl/0.1",
  resolution: {
    criterion: {
      kind: "threshold",
      metric: {
        name: "US CPI year-over-year rate",
        unit: "percent",
        extraction: "Read the annual percent change from the CPI publication.",
        revisionPolicy: "first-published-value",
      },
      comparator: "greater-than-or-equal",
      threshold: 3,
    },
    canonicalStatement: "",
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
        publicationSchedule: "Published monthly by the BLS.",
        publiclyAccessible: true,
        independenceNote: "The publisher is a government statistics agency.",
      },
    ],
    primarySourceId: "bls-cpi",
    fallbacks: [],
    resolutionDeadline: "2027-01-31T23:59:59Z",
    earlyResolution: { allowed: false },
    terminalAmbiguityPolicy: "void-and-refund",
    edgeCases: [
      {
        scenario: "If the source retracts the first value before the deadline.",
        disposition: "Use the corrected value published before the deadline.",
      },
      {
        scenario: "If no value is published before the deadline.",
        disposition: "Apply the terminal ambiguity policy.",
      },
      {
        scenario: "If the dataset is renamed without method changes.",
        disposition: "Use the renamed successor dataset.",
      },
    ],
    disputeWindowHours: 24,
  },
};

const canonicalStatement = renderCanonicalStatement(spec);
const validatedSpec = EventContractSpec.parse({
  ...spec,
  resolution: {
    ...spec.resolution,
    canonicalStatement,
  },
});

console.log(validatedSpec.resolution.canonicalStatement);
```

## Disclaimer
See [DISCLAIMER.md](DISCLAIMER.md) for important information about the legal and regulatory status of outputs produced by this tooling.

## License
Copyright © 2026 Christopher Maximilian Altmann. Licensed under the Apache License, Version 2.0.
