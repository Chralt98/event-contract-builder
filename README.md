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

## Develop with local plugins

Keep **Bleavit Foresight Local** for local development and **Bleavit Foresight**
for production. They are separate plugin copies with different update paths:

| Plugin copy                                        | Source of its skills                           | How to update it                                                                            |
| -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Bleavit Foresight Local**                        | Private Plugin Creator release in your account | Update the existing plugin with Plugin Creator. Repository edits do not sync automatically. |
| Repository-linked Codex copy (`bleavit-foresight`) | This checkout through the local marketplace    | Run `bun run refresh:plugin --marketplace-path .local-marketplace/marketplace.json`.        |

The Codex CLI refresh command reinstalls a plugin from its marketplace source.
It cannot update the separate Plugin Creator release, which is stored in your
account rather than linked to this checkout. Update **Bleavit Foresight Local**
through Plugin Creator after changing the repository skills; keep its existing
plugin identity and local MCP connection. The current Codex plugin CLI has no
command for publishing an account plugin release. See the [local plugin
guide](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually)
for how source-linked local plugins are loaded and refreshed.

The private **Bleavit Foresight Local** plugin connects to
`http://localhost:8787/mcp`. Start the MCP worker in its owning project; this
repository does not include its runtime. The repo-linked Codex plugin uses the
local app mapping from `.app.json`. To create that mapping for this checkout,
copy the example and replace the placeholder with the app's ID:

```sh
cp .app.example.json .app.json
```

`.app.json` is ignored by Git and contains your environment-specific app ID. It
only configures the repository-linked Codex plugin; it does not create or update
the Plugin Creator release. The distributable plugin omits this mapping and
defaults to the production MCP endpoint described below.

### Create or repair the local Codex marketplace

Bun and the Codex CLI are required. Initial setup also uses the plugin-creator
skill's marketplace helper; set `CODEX_PLUGIN_CREATOR` if the skill is installed
somewhere other than `$CODEX_HOME/skills/.system/plugin-creator` (default
`~/.codex`). Run this once for a checkout, or again to repair its marketplace
source link:

```sh
bun run refresh:plugin --setup --marketplace-path .local-marketplace/marketplace.json
```

This creates the ignored `.local-marketplace/`, links its local source to this
checkout, registers the marketplace with Codex, and installs the plugin. The
installed Codex plugin includes the repository's skills. Setup refuses to
replace a source link that points to another checkout.

The bare `bun run refresh:plugin` command defaults to the personal marketplace
at `~/.agents/plugins/marketplace.json`. This setup uses the checkout-local
marketplace instead, so use the same `--marketplace-path` on refresh and check
commands below. The bare command still works when the plugin is installed from
the personal marketplace.

### Refresh the repository-linked Codex plugin

After changing skills or plugin metadata, refresh from the same marketplace:

```sh
bun run refresh:plugin --marketplace-path .local-marketplace/marketplace.json
```

To verify the marketplace link without reinstalling:

```sh
bun run refresh:plugin --check --marketplace-path .local-marketplace/marketplace.json
```

Refresh updates the installed Codex copy and prunes development files from its
cache. Start a **new Codex task** to load the refreshed skills. The command does
not update ChatGPT's MCP connection metadata; refresh the ChatGPT app connection
after changing its tool descriptions or schemas.

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
