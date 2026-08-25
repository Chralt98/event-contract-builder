# event-contract-builder

An MCP server and TypeScript schema library for turning a free-form event
description into a prediction-market event contract.

## Status

Early development; the public API and tool set may change before v1.0.0.

The packaged skills are the semantic workflow layer for drafting questions,
defining terms, and selecting resolution sources. The MCP server is the
deterministic execution layer that validates and renders their structured
outputs. The schema library (`src/schema`) models the eventual full
event-contract specification — see [Library (schema)](#library-schema) below.

## MCP server

`server/` runs a stateless HTTP MCP server exposing deterministic tools for
validating, rendering, and checking the structured outputs produced by the
packaged skills.

### Run it

```sh
bun install
bun run dev:server
```

This starts the server at `http://localhost:8787/mcp` and restarts on file
changes.

For a local MCP client or a tunnel client that expects a Stdio command, use
the separate Stdio entrypoint:

```sh
bun run start:server:stdio
```

The Stdio entrypoint uses the same tools and server factory as the HTTP
endpoint. Its stdout is reserved for MCP protocol messages; diagnostics go to
stderr.

Inspect it locally with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```sh
bun run dev:server:inspect
```

To connect an external client (e.g. ChatGPT developer mode) to your local
server, expose it over HTTPS. For the Secure MCP Tunnel workflow, see
[Secure MCP Tunnel](#secure-mcp-tunnel) below:

```sh
bun run dev:server:tunnel
```

### Secure MCP Tunnel

The local HTTP MCP server is available at `http://localhost:8787/mcp`. To
connect it to an existing tunnel in the OpenAI platform, run the server and
the tunnel client in separate terminals.

#### 1. Start the local MCP server

```sh
bun run dev:server
```

Keep this terminal open while the tunnel is in use.

#### 2. Set the runtime key without echoing it

Create or select a credential with the minimum permission **Tunnels: Read and
Use** only. In a separate terminal, enter the key silently into the current
shell:

```sh
read -r -s CONTROL_PLANE_API_KEY
export CONTROL_PLANE_API_KEY
printf '\n'
```

The key is not printed. Do not put it in this README, the project `.env`, shell
history, or any committed file. Remove it from the shell when finished:

```sh
unset CONTROL_PLANE_API_KEY
```

#### 3. Run the client with the existing tunnel

Use the profile name and tunnel ID from your local setup. Keep the placeholders
below as placeholders when sharing this documentation:

```sh
tunnel-client run \
  --profile <PROFILE_NAME> \
  --control-plane.api-key env:CONTROL_PLANE_API_KEY \
  --control-plane.tunnel-id <TUNNEL_ID> \
  --mcp.server-url "url=http://localhost:8787/mcp"
```

The profile may hold the non-secret configuration, but keys must remain
environment or file references such as `env:CONTROL_PLANE_API_KEY`; never put a
literal key in the profile or a project `.env` file.

#### 4. Diagnose configuration and health

Run the profile checks before starting the client:

```sh
tunnel-client doctor --profile <PROFILE_NAME> --explain
```

After startup, check the local liveness and readiness endpoints (the default
health listener is `127.0.0.1:8080`):

```sh
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/readyz
```

#### 5. Keep the tunnel running

`tunnel-client run` is a foreground process. Leave its terminal open for as
long as the MCP endpoint should remain available; closing it or pressing
`Ctrl-C` stops the tunnel. Do not commit the key, tunnel ID, or other user data
from your local setup to this repository.

### Tools

| Tool                         | Purpose                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `submit_drafted_questions`   | Validate and render binary, scalar, and categorical display-question units.    |
| `submit_defined_terms`       | Validate and render definitions for a selected unit.                           |
| `propose_resolution_sources` | Validate and render a names-only ranked source hierarchy.                      |
| `submit_resolution_source`   | Validate and render full source details with advisory URL reachability checks. |

The `skills/` directory contains the workflow instructions and supporting
references. It is intended to be packaged with the MCP server as one plugin.

### Plugin package

This repository is also a ChatGPT/Codex plugin package. The manifest at
`.codex-plugin/plugin.json` discovers the three workflow skills, and
`.mcp.json` connects the plugin to the local HTTP MCP endpoint. Start the
server before importing the package into a local host:

```sh
bun run start:server
```

The packaged endpoint is `http://localhost:8787/mcp`. For a hosted ChatGPT
connection, expose the server over HTTPS and replace the endpoint in the
deployment-specific MCP configuration.

### Workflow

1. **Draft** — use the `draft-display-question` skill with a sufficiently
   specific future event, e.g. `"CPI year-over-year inflation might exceed 3
percent in June 2026"`. Organize the result into selectable units, then
   call `submit_drafted_questions` and present its returned Markdown verbatim:

   ```md
   **Unit 1: Scalar market**

   - Will CPI YoY be below 3 percent in June 2026?
   - Will CPI YoY be at least 3 percent in June 2026?

   ---

   Which unit should we use for further specification?
   ```

2. **Select and define** — when the user selects a unit, use the `define-terms`
   skill to propose precise definitions, then call `submit_defined_terms` and
   present its returned Markdown verbatim.

3. **Choose sources** — after the user agrees to the definitions, use the
   `define-resolution-source` skill. First call `propose_resolution_sources`
   with ranked names and publishers only:

   ```json
   {
     "unit_number": 1,
     "selected_unit": {
       "type": "binary",
       "question": "Will CPI YoY be at least 3 percent in June 2026?"
     },
     "sources": [
       {
         "rank": 1,
         "name": "Consumer Price Index",
         "publisher": "U.S. Bureau of Labor Statistics"
       }
     ],
     "followUp": "Does this source hierarchy look right?"
   }
   ```

4. **Submit sources** — after the user approves the hierarchy, call
   `submit_resolution_source` with the full source records and present its
   returned Markdown verbatim. Revise the hierarchy if the user requests it.

## Library (schema)

`src/schema` models a complete event-contract specification — meta,
underlying event, outcome, trading parameters, resolution, payout, integrity
assessment, and compliance posture — as `zod` schemas, published as an npm
package.

**This library has no consumer in this repo yet.** The MCP server above only
validates and renders workflow outputs; nothing currently assembles
those into a full `EventContractSpec`. Treat the example below as a
standalone demonstration of the schema, not a description of an existing
pipeline.

### Installation

```sh
npm install event-contract-builder
```

### Product name

Every contract has a trader-facing product name — a free-form question
string (10–200 characters, ending with `?`). Names are typically authored by
agents/LLMs via prompt guidance rather than assembled from fixed slots, so
the schema imposes only length and punctuation constraints.

```ts
const productName = "Will CPI YoY be at least 3 percent?";
```

### Build and validate a full contract spec

A complete spec includes meta (with product name), underlying event, outcome, trading parameters, resolution, payout, integrity assessment, and compliance posture. The `canonicalStatement` is rendered from structured resolution fields — hand-written statements that drift from the structured terms fail validation.

The example below is **condensed for readability**: a few required blocks (`scheduledResolutionTime`, `calculationMethodologyControls`, `fallbackControls`, `forceMajeure`) are omitted where marked. See the schema for the full set of required fields.

```ts
import {
  EventContractSpec,
  renderCanonicalStatement,
  type EventContractSpecT,
} from "event-contract-builder";

const spec: EventContractSpecT = {
  dsl: "event-contract-cnl/0.1",
  meta: {
    ticker: "CPI-26JUN-T3.0",
    productName: "Will CPI YoY be at least 3 percent?",
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
        unlawfulUnderFederalOrStateLaw: {
          settlementDeterminedByActivity: false,
          note: "",
        },
        terrorism: { settlementDeterminedByActivity: false, note: "" },
        assassination: { settlementDeterminedByActivity: false, note: "" },
        war: { settlementDeterminedByActivity: false, note: "" },
        gaming: { settlementDeterminedByActivity: false, note: "" },
        commissionDesignatedSimilarActivity: {
          settlementDeterminedByActivity: false,
          note: "",
        },
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
        rank: 1, // unique, contiguous from 1; the rank-1 source must be primarySourceId
        controlsFor: ["headline value", "publication timing"],
        name: "Consumer Price Index",
        publisher: "U.S. Bureau of Labor Statistics",
        url: "https://www.bls.gov/cpi/",
        datasetId: "CUSR0000SA0",
        publicationSchedule:
          "Published monthly, typically around the 10th-14th of the following month.",
        publiclyAccessible: true,
        independenceNote:
          "The BLS is a principal federal statistical agency independent of market participants.",
      },
    ],
    primarySourceId: "bls-cpi",
    fallbacks: [],
    requiredPublicEvidence: [
      "The official BLS CPI Summary table for the reference month is published and publicly accessible.",
    ],
    correctionOrRevisionPolicy:
      "Apply only official BLS corrections published before the resolution deadline; revisions published after the deadline are disregarded.",
    materiality: {
      minimumQualifyingThreshold:
        "Only an official BLS CPI-U all-items release covering the full reference period qualifies as the settlement value.",
      deMinimisExclusions: [
        "Preliminary, flash, or unofficial CPI estimates from non-BLS aggregators do not qualify.",
      ],
    },
    exclusions: {
      prohibitedFeatures: [],
      nonQualifyingCases: [
        "A CPI value published by any source other than the BLS does not qualify.",
      ],
      antiRebrandingRule:
        "Classify the series by its published methodology and identifier, not by any renamed or successor label.",
    },
    resolutionDeadline: "2027-01-31T23:59:59Z",
    earlyResolution: { allowed: false },
    terminalAmbiguityPolicy: "void-and-refund",
    edgeCases: [
      {
        scenario:
          "If the BLS retracts the first published value before the resolution deadline.",
        disposition:
          "Use the corrected value published before the resolution deadline.",
      },
      {
        scenario:
          "If no CPI value is published before the resolution deadline.",
        disposition:
          "Apply the terminal ambiguity policy and void the contract.",
      },
      {
        scenario:
          "If the BLS renames the CPI series without changing methodology.",
        disposition:
          "Use the renamed successor series as the primary data source.",
      },
    ],
    disputeWindowHours: 24,
    // Omitted for brevity: scheduledResolutionTime, calculationMethodologyControls,
    // fallbackControls, forceMajeure — all required by the schema.
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

// Render the canonical statement, then validate (once the omitted required
// blocks above are supplied, EventContractSpec.parse returns the typed spec).
const canonicalStatement = renderCanonicalStatement(spec);
const validated = EventContractSpec.parse({
  ...spec,
  resolution: { ...spec.resolution, canonicalStatement },
});

console.log(validated.meta.productName);
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
