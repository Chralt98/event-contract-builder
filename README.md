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

## Develop with the local plugin

Use the repository-linked plugin copy for local development and keep the
production plugin connected to the deployed service. The local copy connects to
`http://localhost:8787/mcp`; start the MCP worker in its owning project, since
this repository does not include its runtime.

The repository-linked plugin uses the local app mapping from `.app.json`. To
create that mapping for this checkout, copy the example and replace the
placeholder with the app's ID:

```sh
cp .app.example.json .app.json
```

`.app.json` is ignored by Git and contains your environment-specific app ID. The
tracked `.mcp.json` and `mcp.json` stay pointed at localhost for development;
`mcp.production.json` stores the deployed endpoint. Run
`bun run refresh:plugin -- --production` to install a copy using that endpoint,
or omit `--production` to restore the local endpoint. The distributable plugin
omits the local app mapping and uses the production configuration described
below.

### Refresh the repository-linked plugin

After changing skills or plugin metadata, refresh the copy installed from your
personal marketplace:

```sh
bun run refresh:plugin
```

The command defaults to `~/.agents/plugins/marketplace.json`, checks that its
local source points to this checkout, and installs the updated plugin. If you
use a different marketplace, pass its `marketplace.json` path explicitly. To
check the personal marketplace link without reinstalling:

```sh
bun run refresh:plugin --check
```

Refresh updates the installed plugin and prunes development files from its
cache. Start a **new Codex task** to load refreshed skills. After changing MCP
tool descriptions or schemas, refresh the app connection as well.

## Package the plugin

```sh
bun run package:plugin
```

This creates `out/bleavit-foresight.zip` and an unpacked plugin directory from
an explicit asset allowlist. The archive includes the skills, manifest, MCP
configuration and license notices, including `THIRD_PARTY_LICENSES.md`. It
excludes the library build, development files and local app mapping. Its
manifest omits the local `apps` reference. By default, its MCP configuration
uses the endpoint in `mcp.production.json` for both packaged MCP configs;
override it for another environment with `bun run package:plugin -- --mcp-url
https://your-endpoint.example/mcp`. The tracked development configs remain
pointed at localhost. This command does not publish anything.

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

The package exports the site’s shared visual tokens and icon through
`event-contract-builder/appearance/tokens.css` and
`event-contract-builder/appearance/foresight-icon.png`. Their canonical sources
remain in [`site/tokens.css`](site/tokens.css) and `site/assets/`.
