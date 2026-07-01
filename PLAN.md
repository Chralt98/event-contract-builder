# event-contract-builder: ChatGPT App + Library + CLI

## Goal

Turn `event-contract-builder` into a ChatGPT App while preserving the existing
TypeScript implementation as the domain library.

The product has four boundaries:

- **`src/`** — the public npm library: framework-independent event-contract
  schemas and business logic.
- **`cli/`** — terminal adapter over the library.
- **`server/`** — HTTP MCP server, Apps SDK tool handlers, and widget resource.
- **`web/`** — React + Vite + TypeScript widget rendered inside ChatGPT.

The repository remains one package with one root `package.json`; these folders
are architectural boundaries, not independently published workspace packages.

## Current state

Most schema work already exists under `src/schema/`, together with CNL and
range-contract helpers under `src/`.

The current scope does **not** redesign the event-contract schema or move it
out of `src/`. Existing schema behavior and public exports should be preserved.
Any future schema changes require a separate plan update.

## Approved scope change: product-name simplification

The `meta.productName` field is being de-structured. Rather than a CNL template
union with a deterministic renderer and lexical guards, the product name becomes
a **free-form question string**, because names are authored by agents/LLMs via
prompt guidance (MCP) rather than assembled from fixed slots.

Target shape: `meta.productName` is a plain string with only two structural
constraints retained — bounded length (10–200) and a trailing `?`. Removed: the
`Will|Which|What` opener regex, the hedging-term denylist, the
`ProductNameStructure` discriminated union, and the render-and-compare against
`renderProductName`.

The `cnl-product-name.ts` module and the `expand-range-contracts.ts` helper
have been removed entirely. Range expansion is deferred.

Steps (all done):

1. Convert `ProductName` to a bare question string and update `meta.ts` and
   tests.
2. Remove the CNL product-name module and its public re-export; update
   README and `src/index.ts` prose.
3. Remove `expand-range-contracts.ts` and its tests.

## Approved scope change: structured draft output

A structured shape for drafted display questions was added, split across two
tools rather than folded into `draft_display_questions` directly.

Output/draft shape: an array of selectable **units**, each a discriminated
union on `type`:

- `binary` — a single standalone Yes/No market: `{ type, question }` (one
  question string).
- `scalar` — a numeric outcome split into non-overlapping ranges:
  `{ type, questions[] }`.
- `categorical` — a set of mutually exclusive options: `{ type, questions[] }`.

Plus a required `followUp` string (the existing follow-up line). Each `binary`
unit and each `scalar`/`categorical` group is one selectable unit, matching the
existing Selection granularity rule.

**Rejected approach: MCP sampling.** An earlier version of this change made
`draft_display_questions` itself a generating tool with a declared
`outputSchema`, drawing the draft via `server.createMessage` (MCP sampling) so
the connected host's own model produced the structured JSON. This was reverted
after manual testing showed the call hanging until the SDK's 60s default
request timeout.
`sampling/createMessage` requests. Any tool needing host intelligence must stay
prompt-returning; it cannot block on a sampling round trip.

**Approach taken: two tools, prompt-returning + deterministic.**

- `draft_display_questions` is unchanged in shape from before this scope
  change — it has no `outputSchema` and returns the `draft-display-questions.md`
  prompt as text for the host's own model to act on in its next turn, the same
  way `define_terms` does.
- A new tool, `submit_drafted_questions`, has both `inputSchema` and
  `outputSchema` set to the units/`followUp` shape. It performs no generation:
  it is purely deterministic, validating the host-drafted input and echoing it
  back as `structuredContent`.
- The prompt's Output section instructs the host model to present the
  plain-text questions as before, then call `submit_drafted_questions` once
  with the same draft organized into `units`, after it has finished drafting
  (not during drafting, and not when the Selection guard or Stop rules apply).

Steps (all done):

1. Define the Zod unit/output schema (`draftUnitSchema`,
   `draftDisplayQuestionsOutputShape`) shared by input and output.
2. Revert `draft_display_questions` to a plain prompt-returning tool (no
   `outputSchema`, synchronous handler).
3. Add `submit_drafted_questions` with `inputSchema = outputSchema` set to the
   shared shape; handler validates via the registered schema and echoes
   `structuredContent`.
4. Update the prompt's Output section to add the `submit_drafted_questions`
   call as a final step, without changing the plain-text question format.
5. Update server tool/prompt tests for the two-tool shape.

## Target directory structure

```text
event-contract-builder/
├── src/                          # Public npm library
│   ├── schema/                   # Existing schemas; no redesign in this plan
│   ├── lib/                      # Generation, validation, conversion, expansion
│   ├── cnl.ts                    # Existing CNL public entry point
│   ├── cnl-resolution-statement.ts
│   └── index.ts                  # Public library API
├── test/                         # Library tests
├── cli/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── generate.ts
│   │   │   ├── validate.ts
│   │   │   └── convert.ts
│   │   └── index.ts
│   └── test/
├── server/
│   ├── src/
│   │   ├── tools/
│   │   │   ├── generate.ts
│   │   │   ├── validate.ts
│   │   │   └── convert.ts
│   │   ├── widget.ts            # Registers and serves the UI resource
│   │   └── index.ts             # HTTP MCP server + tool registration
│   └── test/
├── web/
│   ├── src/
│   │   ├── component.tsx        # React widget and mount point
│   │   ├── mcp-app.ts           # MCP Apps bridge helpers
│   │   └── app.css
│   ├── dist/
│   │   ├── app.js               # Vite bundle read by the server
│   │   └── app.css
│   ├── index.html
│   ├── tsconfig.json
│   └── vite.config.ts
├── index.ts                     # Package re-export from src
├── package.json
└── README.md
```

`web/dist/` is generated output. It is included in deployment artifacts but is
not edited by hand.

## Architecture

1. ChatGPT calls an MCP tool exposed by `server/`.
2. The tool handler delegates all event-contract behavior to `src/`.
3. The handler returns concise `content` plus typed `structuredContent`.
4. The tool descriptor points to a versioned widget resource URI.
5. The server registers that resource as `text/html;profile=mcp-app`, inlining
   `web/dist/app.js` and `web/dist/app.css`.
6. ChatGPT renders the resource in an iframe and sends tool inputs/results to
   the React widget through the MCP Apps JSON-RPC bridge.
7. Widget actions call MCP tools through `tools/call`; the widget does not
   duplicate validation or conversion logic.

The MCP server is HTTP-first and exposes `/mcp`. Stdio is not the primary
ChatGPT App transport. Local development may use an HTTPS tunnel; production
must expose a public HTTPS MCP endpoint.

## Library (`src/`)

The library is the only layer that knows how event contracts are represented,
generated, validated, converted, or expanded.

Required public capabilities:

- Export the existing schemas and inferred TypeScript types.
- Export the existing CNL helpers.
- Generate an event-contract document from structured input.
- Validate unknown input and return structured issues.
- Parse and serialize YAML and JSON.
- Convert valid contracts between YAML and JSON.
- Preserve the existing range-contract expansion behavior.

The library must not import React, Vite, MCP, HTTP, terminal I/O, or ChatGPT
runtime APIs.

## CLI (`cli/`)

The CLI is a thin adapter over the public API in `src/`.

```text
event-contract-builder generate [-i input] [-o output] [-f yaml|json]
event-contract-builder validate <file> [-f yaml|json]
event-contract-builder convert <file> -t yaml|json [-o output] [-f yaml|json]
```

CLI responsibilities are limited to argument parsing, file/stdin I/O,
stdout/stderr formatting, and exit codes. It must not contain independent
schema or conversion logic.

## ChatGPT App server (`server/`)

`server/src/index.ts` creates the MCP server, registers the widget resource,
registers tools, and exposes the HTTP `/mcp` endpoint.

Use `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, and Zod.

### Widget resource

- Register a versioned URI such as
  `ui://event-contract-builder/editor-v1.html`.
- Return `RESOURCE_MIME_TYPE` (`text/html;profile=mcp-app`).
- Inline `web/dist/app.js` and `web/dist/app.css` into the HTML template.
- Set a unique `_meta.ui.domain` before app submission.
- Keep CSP metadata restricted to domains the widget actually uses.
- Change the resource URI when a breaking widget bundle change requires cache
  invalidation.

### Tools

Implement one file and one focused test per tool:

- **`generate_event_contract`** — accepts structured or serialized input,
  returns the generated document and a widget-ready contract summary.
- **`validate_event_contract`** — accepts a document and optional format,
  returns validity plus structured validation issues.
- **`convert_event_contract`** — accepts a document, source format, and target
  format, returning the converted document.

Each tool:

- delegates to `src/`;
- defines input and output schemas;
- returns stable, minimal `structuredContent`;
- includes useful text `content` for model narration;
- points `_meta.ui.resourceUri` to the widget where rendering is useful;
- uses accurate read-only/destructive annotations;
- is idempotent because ChatGPT may retry calls.

No authentication, persistence, billing, or external data source is included
in the first ChatGPT App increment.

## React widget (`web/`)

Use React, Vite, and TypeScript.

The first widget is an event-contract result/editor surface that:

- renders the latest tool result from `structuredContent`;
- displays the generated YAML or JSON document;
- displays validation status and field-level issues;
- lets the user request validation or format conversion through `tools/call`;
- handles missing initial tool input and loading/error states;
- treats all tool inputs and results as untrusted data;
- remains usable in ChatGPT's inline iframe layout.

Use the open MCP Apps bridge for baseline communication. ChatGPT-specific
`window.openai` extensions are optional and should only be added when needed.

Vite must emit stable server-consumed filenames:

```text
web/dist/app.js
web/dist/app.css
```

## Package and build changes

Update the root `package.json` to:

- keep the published library entry point compatible;
- point the CLI bin to the built `cli/` entry;
- add React, React DOM, Vite, and the React Vite plugin;
- add `@modelcontextprotocol/ext-apps`;
- add focused scripts for `build:lib`, `build:web`, `build:cli`, and
  `build:server`;
- make the root `build` run those scripts in dependency order;
- add `dev:web` and `dev:server` scripts;
- include the compiled server, CLI, library, and `web/dist/` in deployment and
  publication artifacts.

The server build depends on the web build because it reads the generated widget
assets. Both the CLI and server depend on the `src/` library build.

## Tests

- **Library tests:** preserve all current schema, CNL, README usage, and
  range-expansion coverage while the new application surfaces are added.
- **CLI tests:** argument parsing, stdin/file input, stdout/file output, and
  non-zero exit status for invalid contracts.
- **Server tests:** tool schemas, valid and invalid tool calls,
  `structuredContent`, annotations, widget resource URI, and resource MIME
  type.
- **Web tests:** render generated output and validation issues from simulated
  MCP Apps bridge messages; verify a widget action sends the expected
  `tools/call` request.
- **Integration test:** build `web/dist`, start the HTTP MCP server, list tools
  and resources through an MCP client, call one tool, and retrieve its widget
  resource.

## Implementation order

Each item below is a separate reviewable step. Complete only one item per turn.

1. Add the smallest library serialization module under `src/lib/`: YAML/JSON
   parsing and serialization, with direct tests.
2. Add the library validation result wrapper around the existing top-level
   schema, with direct tests.
3. Add the library conversion function, with direct tests.
4. Create `cli/src/index.ts` with help/version routing only.
5. Add the CLI `validate` command and direct tests.
6. Add the CLI `convert` command and direct tests.
7. Add the CLI `generate` command and direct tests.
8. Add `web/` Vite scaffolding that builds an empty React mount to
   `web/dist/app.js` and `web/dist/app.css`.
9. Add `web/src/mcp-app.ts` to receive tool-result bridge messages, with a
   focused test.
10. Render one read-only event-contract document view in
    `web/src/component.tsx`, with a focused test.
11. Render validation status and issues in the widget, with a focused test.
12. Add one widget action that sends a `tools/call` validation request, with a
    focused test.
13. Create `server/src/index.ts` with an HTTP `/mcp` endpoint and a server
    construction test.
14. Register the versioned widget resource from `web/dist`, with a resource
    retrieval test.
15. Register `validate_event_contract`, including output schema, annotations,
    and widget metadata, with direct tests.
16. Register `convert_event_contract`, with direct tests.
17. Register `generate_event_contract`, with direct tests.
18. Add one end-to-end build and MCP integration test.
19. Update `README.md` with library, CLI, local ChatGPT App, HTTPS tunnel, and
    production connection instructions.

## Verification

- `bun test`
- `bun run build`
- `bun run typecheck`
- `bun run cli -- --help`
- `bun run cli -- validate <fixture>`
- Start the server and verify `http://localhost:<port>/mcp` with MCP Inspector.
- Retrieve the widget resource and confirm its MIME type is
  `text/html;profile=mcp-app`.
- Connect the HTTPS endpoint from ChatGPT developer mode and verify tool
  invocation, widget rendering, validation, and conversion.

## Deferred

- Schema redesign or new outcome types (except the approved product-name
  simplification described above).
- Authentication and user accounts.
- Persistent contract storage.
- External market or resolution-source integrations.
- App monetization and app-directory submission work beyond the metadata
  required to keep the implementation submission-ready.
