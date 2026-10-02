# Event Contract Builder

Event Contract Builder is the open-source npm package and plugin interface for
**Bleavit Foresight**, a ChatGPT plugin for creating forecast specifications.
The package name remains `event-contract-builder`; its public schemas and
client-visible interface are the ones used by Foresight.

The plugin drafts selectable forecast questions, precise definitions,
independent resolution sources, resolution criteria, historical context, and
optional recent news. Each stage remains pending until the user explicitly
approves it. Probability monitoring is planned; it is not part of the current
workflow.

Third-party workflow attributions and license notices are listed in
[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Use the Foresight TypeScript package

Install the package from npm:

```sh
npm install event-contract-builder
```

The package root exports Foresight schemas, types, structural validation,
client-visible tool descriptors, and server instructions. The same API is also
available from the `event-contract-builder/foresight` subpath.

```ts
import {
  DraftUnit,
  foresightTools,
  type DraftUnitT,
} from "event-contract-builder";

const draft: DraftUnitT = {
  question: "Will CPI year-over-year inflation exceed 3 percent in June 2027?",
};

const validatedDraft = DraftUnit.parse(draft);
const submitQuestionsTool = foresightTools.submit_drafted_questions;

console.log(validatedDraft.question);
console.log(submitQuestionsTool.title);
```

The npm package describes and validates the public interface. It does not
include tool handlers, workflow state, or the hosted service. Approved
specifications are retrieved through the public MCP interface.

## Forecast workflow

The workflow is: draft questions, select a unit, define terms, choose resolution
sources, define resolution criteria, add background information, and optionally
add recent news. `reduce-semantic-risk` supports focused interpretation audits.

Question drafting in Bleavit Foresight is informed by Metaculus’s
[question-writing guidance](https://www.metaculus.com/faq/).

Instruction ownership is deliberately split to avoid duplicate maintenance:

- `src/foresight/instructions.md` owns cross-stage state, language, rendering,
  approval, and export conventions.
- Each `skills/*/SKILL.md` is a short workflow entry point.
- Each skill reference owns that stage's semantic rules and detailed format.
- `src/foresight/tools.ts` exposes concise tool intent and machine-enforced
  schemas; it does not restate skill procedures.

Change a rule at its owning layer rather than copying it into another one.

## Hosted service and repository boundary

This repository contains the open-source Foresight package, plugin assets,
seven skills, and client-visible MCP interface. The hosted Bleavit Foresight
service provides MCP execution, workflow state, rendering, and future
monitoring services. Those operational components are not included here. See
the [repository boundary](docs/repository-boundary.md) for details.

The public package builds and tests independently:

```sh
bun install
bun run test
bun run check
```

The plugin ID is `bleavit-foresight`; the npm package remains
`event-contract-builder`. The plugin display name is Bleavit Foresight. The
open-source repository remains usable for inspecting, adapting, and
implementing the published interface; service access and operational
components are provided separately.

## Install or refresh the local plugin

For a local ChatGPT app mapping, copy the example and replace its placeholder:

```sh
cp .app.example.json .app.json
```

`.app.json` stays ignored; it identifies your own ChatGPT connection. Bun and
the Codex CLI are required for refresh and check. The `--setup` command also
requires the plugin-creator skill; set `CODEX_PLUGIN_CREATOR` if it is installed
somewhere other than `$CODEX_HOME/skills/.system/plugin-creator` (default
`~/.codex`).

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

## Package the plugin

```sh
bun run package:plugin
```

This creates `out/bleavit-foresight.zip` and an unpacked plugin directory from
an explicit asset allowlist. The archive includes the skills, manifest, MCP
configuration and license notices, including `THIRD_PARTY_LICENSES.md`. It
excludes the library build, development files and local app mapping. Its
manifest omits the local `apps` reference. By default, its MCP configuration
points to `https://api.foresight.bleavit.com/mcp`; override this for another
environment with `bun run package:plugin -- --mcp-url
https://your-endpoint.example/mcp`. The tracked `.mcp.json` remains pointed at
localhost for local development. This command does not publish anything.

## Product website

The static product site lives in `site/` and is intended for Cloudflare Pages at
`https://foresight.bleavit.com`. The MCP Worker uses the separate host
`https://api.foresight.bleavit.com/mcp`. Keep the product overview and public
support and policy pages in the site; do not include Worker secrets or D1
configuration there.

## Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md) for important information about the legal
and regulatory status of forecast specifications produced with this tooling.

## License

Copyright © 2026 Christopher Maximilian Altmann. Licensed under the Apache
License, Version 2.0.
