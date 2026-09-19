# Event Contract Builder

Open-source event-contract schema library and shared plugin interface.

The first product under this umbrella is **Bleavit Foresight**:

> ChatGPT plugin for creating forecast specifications.

The current plugin drafts **forecast specifications**: selectable questions,
precise definitions, independent resolution sources, resolution criteria,
historical context/background information, optional recent news, and explicit
approvals.
Probability monitoring is planned. Full event-contract drafting is outside the
current plugin workflow; the general event-contract schema library remains
available separately below.

Third-party workflow attributions and license notices are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Hosted service and repository boundary

This repository contains the open-source library, plugin assets, seven skills,
and client-visible MCP interface. The hosted Bleavit Foresight service provides
MCP execution, workflow state, rendering, and future monitoring services. Those
operational components are not included in this repository.

The public package builds and tests independently. See the
[repository boundary](docs/repository-boundary.md) for the capabilities and
contribution boundaries. There is no active hosted-service implementation in
this repository.

```sh
bun install
bun run test
bun run check
```

The public package builds independently of the hosted service. Existing imports
are retained; the forecast interface is available through a new subpath:

```ts
import {
  foresightTools,
  foresightServerInstructions,
} from "event-contract-builder/foresight";
```

It exports tool descriptors, input/output schemas, forecast types, structural
validation, and client-visible server instructions. Approved specifications
can be retrieved through the public MCP interface. This package contains no
handlers or state store. The plugin ID is `bleavit-foresight`; the npm package remains
`event-contract-builder`. The plugin display name is Bleavit Foresight.

Hosted services and commercial features support continued maintenance and
development of this open-source project. The open-source repository remains
usable for inspecting, adapting, and implementing the published interface;
service access and operational components are provided separately.

Earlier versions of this repository included experimental server code. The
current project separates the open-source schemas, skills, and client-visible
protocol from the hosted Bleavit Foresight service. Existing Git history remains
available for historical context.

## Install or refresh the local plugin

For a local ChatGPT app mapping, copy the example and replace its placeholder:

```sh
cp .app.example.json .app.json
```

`.app.json` stays ignored; it identifies your own ChatGPT connection. The installed
plugin-creator helpers and Codex CLI are required for the following commands.
Set `CODEX_PLUGIN_CREATOR` only if the skill is installed somewhere other than
`$CODEX_HOME/skills/.system/plugin-creator` (default `~/.codex`).

```sh
# First setup, or repair a missing personal-marketplace source link:
bun run refresh:plugin --setup

# After changing skills or plugin metadata:
bun run refresh:plugin

# Read-only source verification:
bun run refresh:plugin --check
```

Setup uses the plugin-creator marketplace helper and creates a source link to
this checkout. Refresh refuses to reinstall an entry that points elsewhere.
After installation it removes development files from the newly created Codex
cache, retaining only plugin assets and the intentional local app mapping.
Start a **new Codex task** after refreshing to load the updated plugin.

For local development, connect the plugin to an MCP server that implements the
public interface. For the hosted Bleavit Foresight service, use the endpoint and
authentication method provided with your service access. Refresh the ChatGPT
connection after tool descriptions or schemas change; the Codex refresh command
does not update ChatGPT's connection metadata.

## Forecast workflow

The workflow is: draft questions, select a unit, define terms, choose resolution
sources, define resolution criteria, add background information, and optionally
add recent news. Each submitted stage remains pending until the user explicitly
approves it. `reduce-semantic-risk` supports focused interpretation audits.

Instruction ownership is deliberately split to avoid duplicate maintenance:

- `src/foresight/instructions.md` owns cross-stage state, language, rendering,
  approval, and export conventions.
- Each `skills/*/SKILL.md` is a short workflow entry point.
- Each skill reference owns that stage's semantic rules and detailed format.
- `src/foresight/tools.ts` exposes concise tool intent and machine-enforced
  schemas; it does not restate skill procedures.

Change a rule at its owning layer rather than copying it into another one.

## Package the plugin

```sh
bun run package:plugin
```

This creates `out/bleavit-foresight.zip` and an unpacked plugin directory
from an explicit asset allowlist. The archive includes the skills, manifest, MCP
configuration and license notices, including `THIRD_PARTY_LICENSES.md`. It
excludes the library build, development files and local app mapping. Its manifest
omits the local `apps` reference. Configure the
MCP endpoint for the service or local server you intend to use. This command
does not publish anything.

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

A complete spec includes meta (with product name), underlying event, outcome, trading parameters, resolution, payout, integrity assessment, and compliance posture. The `resolutionRule` is open text so the rule can fit the question being forecast; the surrounding schema keeps sources, timing, evidence, exceptions, and settlement controls explicit.

The example below is **condensed for readability**: a few required blocks (`scheduledResolutionTime`, `calculationMethodologyControls`, `fallbackControls`, `forceMajeure`) are omitted where marked. See the schema for the full set of required fields.

```ts
import {
  EventContractSpec,
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
    resolutionRule:
      "Resolve YES when the official BLS CPI Summary reports a CPI-U all-items year-over-year rate of at least 3 percent for the reference month; otherwise resolve NO.",
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

// Once the omitted required blocks above are supplied,
// EventContractSpec.parse returns the typed spec.
const validated = EventContractSpec.parse(spec);

console.log(validated.meta.productName);
// → "Will CPI YoY be at least 3 percent?"

console.log(validated.resolution.resolutionRule);
// → "Resolve YES when the official BLS CPI Summary reports a CPI-U all-items
//    year-over-year rate of at least 3 percent for the reference month;
//    otherwise resolve NO."
```

## Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md) for important information about the legal and regulatory status of outputs produced by this tooling.

## License

Copyright © 2026 Christopher Maximilian Altmann. Licensed under the Apache License, Version 2.0.
