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

A structured shape for drafted display questions is validated and rendered by
`submit_drafted_questions`. The semantic drafting workflow belongs to the
packaged `draft-display-question` skill, rather than to a prompt-returning MCP
tool.

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
`sampling/createMessage` requests. Semantic generation is handled by the
packaged skill; MCP tools remain deterministic and do not block on a sampling
round trip.

**Approach taken: skill + deterministic tool.**

- `skills/draft-display-question/SKILL.md` defines the workflow boundary,
  selection guard, stop rules, and output organization, with detailed rules in
  `references/drafting-spec.md`.
- `submit_drafted_questions` has both `inputSchema` and
  `outputSchema` set to the units/`followUp` shape. It performs no generation:
  it validates the skill-produced input, renders the trader-facing Markdown,
  and returns the same structured content.

Steps (all done):

1. Define the Zod unit/output schema (`draftUnitSchema`,
   `draftDisplayQuestionsOutputShape`) shared by input and output.
2. Add the focused `draft-display-question` skill and its drafting reference.
3. Add `submit_drafted_questions` with `inputSchema = outputSchema` set to the
   shared shape; the handler validates, renders, and returns `structuredContent`.
4. Remove the duplicate prompt-returning tool and MCP prompt registration.
5. Update server tests to cover the deterministic tool shape.

## Approved scope change: template draft units

Draft output gains a fourth selectable unit type, `template`, alongside the
existing concrete binary, scalar, and categorical units. A template represents
a configurable family of closely related binary display questions. It does not
replace the concrete draft: when several concrete questions share a common
event phrasing but vary by values such as dates, thresholds, comparators, or
options, the drafting workflow appends a template unit in addition to the
existing concrete units.

Target shape:

```json
{
  "type": "template",
  "question": "Will Bitcoin's USD price be <comparator> <price> on <date>?",
  "variables": [
    { "name": "comparator", "values": ["below", "at least"] },
    { "name": "price", "values": ["$60k", "$100k"] },
    { "name": "date", "values": ["November 26, 2026"] }
  ]
}
```

`variables` is an ordered, non-empty array rather than Bitcoin-specific fields
or a free-form object. Each entry has a placeholder `name` and a non-empty list
of allowed string `values`. The names must correspond exactly to the distinct
angle-bracket placeholders in `question`; every placeholder must have one
entry, no undeclared variable is allowed, and values within an entry must be
unique. This keeps the shape generic, connector-safe, and deterministically
renderable. The template question retains the 10–200 character bound and
trailing `?`, but unlike a concrete `DisplayQuestion`, it intentionally
contains unresolved placeholders.

Template units remain selectable as whole units and pass unchanged into the
term-definition and resolution-source steps. The draft renderer labels them
`Template market`, shows the question template, and lists each placeholder's
allowed values as separate nested bullets. The drafting skill should append one
when two or more concrete
questions can usefully be expressed as one shared template with explicit value
choices; it must retain the concrete units and must not invent a missing event
or time boundary merely to construct a template.

Steps:

1. Add the domain and connector-safe `template` unit schemas, exact
   placeholder/variable validation, and direct schema/tool-boundary tests —
   done.
2. Render template units in draft and selected-unit views, and add tool tests
   for the Markdown and structured-content round trip — done.
3. Update the drafting, definition, and resolution-source skill guidance plus
   MCP instructions and README documentation for template creation, selection,
   and handoff — done.

## Approved scope change: resolution-source step

The specification flow gains a step after `define_terms`: identify the
authoritative data source(s) that will settle a selected unit and rank them
into a fixed fallback hierarchy. It comes before timing because the resolution
deadline and observation window are anchored to a source's publication
schedule, and because naming the source is the natural continuation of
disambiguating the terms it measures.

The step is presented to the user in **two turns**, with source-selection
semantics in the packaged `define-resolution-source` skill and each visible
format backed by a deterministic tool. Turn 1 calls
`propose_resolution_sources` to reveal the ranked source identities — names,
publishers, and clickable URLs — and asks whether the hierarchy is right;
Turn 2, only after the user approves, calls `submit_resolution_source` with the
full `DataSource` records and presents the user-facing source detail. This keeps
the user from being buried in per-source detail for sources they may not want.

Before rendering Turn 1, `propose_resolution_sources` silently preflights every
clickable proposal URL, including alternative-market source URLs, with the
shared redirect-following HEAD/GET check and keeps only final HTTP `200` links.
It does not expose those preflight statuses; full advisory link-check details
remain internal in both turns. Turn 2 still checks its source URLs and emits a
single aggregate warning when a source is unavailable, without exposing the
individual status.

The visible formats remain deterministic and unit-testable in
`server/src/render.ts`; semantic instructions remain in the skills and their
references. The MCP server does not register prompt-returning workflow tools or
MCP prompts.

The skills-first shape is:

- `skills/define-resolution-source/SKILL.md` defines the two-turn source
  workflow and uses the agreed definitions as its input context.
- `propose_resolution_sources` — deterministic, idempotent, state-recording, `inputSchema =
outputSchema` with `unit_number`, `selected_unit`, `sources` (a ranked array of
  `rank`/`name`/`publisher`/`url`, `min(1)` with rank 1 primary and, by default,
  rank 2 fallback), and `followUp`. Renders the Turn 1 hierarchy with each URL
  as an explicit Markdown link via `renderSourceProposal`, adds a warning when
  only the primary is supplied, and echoes `structuredContent`.
- `submit_resolution_source` — deterministic, idempotent, state-recording, `inputSchema = outputSchema`
  with `unit_number`, `selected_unit`, `sources` (a ranked array reusing the
  existing `DataSource` schema, `min(1)` with rank 1 primary and, by default,
  rank 2 fallback), and `followUp`. Validates and echoes `structuredContent`;
  renders sources in rank order and warns when only the primary is supplied.

Scope is source identity/hierarchy only. Settlement calculation
(`settlementCalculationProcedure`, methodology locking) and timing are
deferred to later steps.

`submit_resolution_source` renders only the user-facing source details. It does
not expose transient URL reachability statuses or the `publiclyAccessible`
metadata in its Markdown; those fields remain part of the validated
`DataSource`/`structuredContent` shape. It still checks each source URL and
retains only an aggregate unavailable-source warning. Semantic "correct in
this context" remains the model/user's responsibility.

**Known limitation — host reformatting.** The submit tool returns fully
formatted Markdown (name as a plain bold header, each attribute as a `- `
bullet), but the ChatGPT host model composes its own reply from that output and
has been observed paraphrasing it — flattening the bullets into plain lines,
dropping the bold name, and renaming fields (e.g. `URL` → "API URL"). The
current mitigation is instruction-level only: the
`define-resolution-source` skill and `instructions.md` instruct the model to
preserve the complete returned Markdown while translating fixed English labels
into the user's language. This makes faithful localized rendering likely but
cannot guarantee it. The
robust fix is deferred (see Deferred): render the hierarchy in the `web/` React
widget from `structuredContent` instead of relying on the model to echo text.

Steps (all done):

1. Add the `define-resolution-source` skill and its source reference, plus the
   `renderDefinitions` / `renderSources` helpers in `server/src/render.ts`.
2. Add the `submit_resolution_source` tool (`inputSchema = outputSchema` over
   the ranked `DataSource` array).
3. Register the deterministic proposal/submission tools and document the step
   in `instructions.md`.
4. Add server tool tests for the new step.
5. Move the original Turn 1 names-only format into a
   `propose_resolution_sources` tool backed by `renderSourceProposal`; slim
   the server instructions to cross-tool guidance.

## Approved scope change: default primary and fallback sources

The resolution-source workflow defaults to at least two ranked sources: a rank-1
primary and a rank-2 fallback. A user may intentionally choose only the rank-1
primary, but that one-source hierarchy remains valid and is rendered with a
visible warning that a source failure would leave no pre-approved fallback.
Additional sources remain allowed only for concrete, pre-specified failure
modes.

Steps (done):

1. Default to and validate the rank-1 primary/rank-2 fallback in both source
   tools, then align the packaged skill guidance, MCP instructions, README, and
   tests.

## Approved scope change: optional fallback warning

The source tools accept a single rank-1 primary when the user explicitly wants
to omit a fallback. They continue to require unique, contiguous ranks starting
at 1, and they render a `⚠` warning in the visible proposal (and again during
registration) when no rank-2 fallback is supplied. The warning explains that a
source outage, missing report, or other source failure would leave the market
without a pre-approved resolution source.

Steps (done):

1. Relax both source arrays to `min(1)`, add the single-source warning, align the
   guidance and tests, and refresh the installed plugin.

## Approved scope change: clickable proposal source URLs

The Turn 1 `propose_resolution_sources` result must let the user open each
candidate source before approving the hierarchy. Each proposal source therefore
includes its exact `url`, and `renderSourceProposal` displays that value as an
explicit Markdown link. The proposal remains concise: full source metadata
belongs to `submit_resolution_source` in Turn 2, while URL preflight statuses
remain internal.

Steps (done):

1. Add `url` to the proposal schema and rendered Markdown; align the
   resolution-source skill, server instructions, README, and focused tool tests.

## Approved scope change: independent source coverage and intent-preserving alternatives

The resolution-source workflow must distinguish genuinely independent sources
from a second page, mirror, or dataset published by the same source agency. A
ranked hierarchy must therefore prefer distinct publishers/source agencies and
must not present two sources from the same agency as independent fallback
coverage. When the selected market has no independent fallback, or a fact in
the agreed definitions has no authoritative primary source, the step must say
so explicitly while keeping the primary-only hierarchy valid when the user
accepts the risk. It must also offer a nearby alternative: a proxy market, a
question whose intent is captured more directly by available sources, or a
better-specified suggestion with at least two independent resolution sources.

The existing deterministic tools remain responsible for structural validation
and visible warnings; semantic source discovery and selecting the best proxy
remain responsibilities of the packaged skill. A source set with a repeated
publisher/source agency is invalid rather than being described as independent.

Step:

1. Enforce distinct source publishers in both resolution-source tools, render
   explicit missing-independent-fallback and missing-primary-coverage
   warnings/alternative guidance, and align the packaged skill, source
   reference, MCP instructions, README, and focused tests.

## Approved scope change: selectable alternative-market question branch

An `alternative_market` suggestion must be a genuinely new prediction-market
display-question proposal, not a redefinition of the selected unit. It carries
a newly drafted, connector-safe `display_question_unit` that preserves the
user's intent closely, expresses it as a proxy, or improves the proposal. The
unit may contain a grouped set of display questions or a template. The user
may select the alternative; only then does that exact question unit enter
`define-terms`. No terms or source hierarchy are pre-resolved for the
alternative, and the candidate sources remain provisional until its own terms
are agreed.

Step:

1. Represent alternative markets as new selectable display-question units,
   render an explicit selection handoff, route the chosen question set through
   `define-terms`, and add focused schema, tool, skill, documentation, and
   handoff tests.

## Approved scope change: preflight proposal source links

`propose_resolution_sources` already renders clickable source URLs, but those
URLs must be checked before the proposal reaches the user. Reuse the existing
short, redirect-following HEAD/GET reachability check in the background and
accept a proposal link only when the final response status is exactly HTTP
`200`. Do not render link-check labels, statuses, or failure details in the
proposal. Non-200 main candidates are silently removed and the remaining
hierarchy is kept contiguous; an alternative-market suggestion is shown only
when at least two of its source URLs pass the same check. If no main source
passes, return no proposal content so the workflow can source replacement
URLs.

Step:

1. Preflight every clickable URL in `propose_resolution_sources`, keep only
   HTTP-200 links in the visible/structured proposal, align the workflow
   guidance and focused tests — done.

## Approved scope change: resolution-source URL locator policy

The URL attached to a resolution source is an inspection locator, not a claim
that the linked page already contains the future market's final value. URL
selection therefore follows a specificity ladder: use a durable event-specific
results page when the exact locator is known; otherwise use the source's stable
canonical results or topic hub. Do not use a historical page for another event,
an ephemeral session/tracking URL, or a methodology/press-release page as the
binding data locator. Methodology pages may be retained only as supporting
references for source identity or publication practice.

An HTTP-200 reachability check confirms that a link is available, but does not
establish that it is authoritative or appropriate for the market. The current
`url` field remains sufficient; this scope change is guidance-only and does not
alter the public schema or renderer.

Implementation step:

1. Generalize the resolution-source skill, MCP instructions, README guidance,
   and focused documentation/tests for the URL locator policy.

## Approved scope change: concise source-detail rendering

The Turn 2 `submit_resolution_source` output should keep checking every source
URL for validity, while keeping transient link-check statuses and the
`publiclyAccessible` field out of the user-facing Markdown. If a source is not
accessible, retain one aggregate warning without exposing the individual
status. The validated source records and their structured content remain
unchanged. The publication field is rendered with the explicit label
`Publishing Schedule`.

Step:

1. Keep submission URL checks, hide their individual statuses and public-access
   metadata, retain the aggregate warning, rename the publication label, and
   align tests and workflow documentation — done.

## Approved scope change: chat-scoped approved contract memory

Each validated workflow handoff must retain the event-contract information
that the user has approved so it can be recalled later in the same chat. The
four existing approval boundaries are recorded as a single event-contract
record: the drafted question units, the selected unit and agreed definitions,
the approved concise source hierarchy, and the approved detailed source
records. A later retrieval tool exposes the latest approved record in
structured form and a concise Markdown rendering for model narration.

The first increment is session/chat-lifetime memory held by the running MCP
server and isolated by the MCP session. The HTTP transport is session-aware for
this workflow, while Stdio keeps one store for its one client process. Memory
is not written to a file or external service, and it is lost when the server
process or session ends. Durable cross-restart storage, authentication, and
user accounts remain deferred.

The approval tools remain idempotent: retries replace the current value for
the same contract and stage rather than creating duplicate records. A stable
contract identifier is carried in structured content so multiple contracts in
one chat can be distinguished; retrieval defaults to the most recently
updated contract and accepts an explicit identifier when supplied.

Implementation step:

1. Add the session-scoped approved-contract store and retrieval tool; wire the
   four workflow tools to save their validated payloads, carry the contract
   identifier through the handoffs, and add focused isolation, retry, and
   retrieval tests — done.

## Approved scope change: explicit cross-session contract handoff

Some hosts invoke successive workflow tools through different MCP HTTP
sessions, even when those calls belong to one user chat. Session-local memory
alone therefore makes the returned `contract_id` unusable at the next step.

Keep the default no-identifier lookup and the per-session unit-matching
fallback isolated to the current MCP session. HTTP sessions may additionally
share a process-lifetime handoff registry, but only an explicitly supplied
`contract_id` may read or update a record in that registry. The identifier is a
random, unguessable bearer handoff; it is not authentication, authorization,
durable storage, or a reason to search the shared registry implicitly. Stdio
continues to use one local store for its one client process. Documentation and
tests must make the bearer trade-off and the retained no-identifier isolation
explicit.

Implementation step:

1. Add an explicit-ID-only process handoff registry for HTTP session stores,
   preserve isolated implicit lookup, and add the separate-session regression
   flow plus security/documentation coverage — done.

## Approved scope change: recall only selected and approved contract content

The recall view must not replay the initial candidate list from
`drafted_questions`. The user-facing result starts with one `Selected Unit`,
then shows the approved definitions and any approved source hierarchy or
detailed source records. The selected unit is rendered once; source stages do
not repeat it. The candidate draft may remain in the internal session record
for handoff matching, but it is excluded from retrieval Markdown and
structured content. A record is recallable only after a selected unit has been
saved by a downstream approval step.

Implementation step:

1. Add an approved-content retrieval projection, update its rendering and
   schema, and cover omission of candidate drafts plus selected-unit ordering
   in tests — done.

## Approved scope change: skills-first plugin architecture

The three semantic workflows are packaged as focused skills with supporting
references:

- `skills/draft-display-question/`
- `skills/define-terms/`
- `skills/define-resolution-source/`

Each skill keeps `SKILL.md` concise and routes detailed policies, schemas, and
examples through `references/`. The MCP server is the controlled execution
layer and exposes these deterministic tools:

- `submit_drafted_questions`
- `submit_defined_terms`
- `propose_resolution_sources`
- `submit_resolution_source`
- `get_approved_event_contract`

The removed `draft_display_questions`, `define_terms`, and
`define_resolution_source` prompt-returning tools, their MCP prompts, and their
duplicated server templates are no longer part of the server surface.

Migration status:

1. Create the three focused skills and supporting references — done.
2. Remove the duplicate prompt layer and prompt capability — done.
3. Reduce server instructions and update tests, tool metadata, README, and this
   plan — done.
4. Add plugin manifest/package wiring and verify skill discovery/import in the
   host — done.

## Approved scope change: language-aware deterministic tool output

The deterministic renderer remains English-only. When the user works in another
language, the host model must present the rendered workflow in the language the
user most likely needs by translating only renderer-generated English labels,
headings, warnings, and other fixed UI text. User-authored and data-bearing
content — including questions, definitions, source names, publishers, URLs,
values, placeholders, ranks, and numbers — must be preserved.

Step:

1. Add the language instruction at the server and packaged-skill boundaries,
   align the user-facing guidance, and keep the renderer and schemas unchanged
   — done.

## Approved scope change: bounded semantic-risk review

The plugin gains a standalone `reduce-semantic-risk` skill for reviewing or
refining prediction-market questions and contract terms before trading. It
makes ordinary resolution cases deterministic, surfaces material exceptional
cases, minimises unilateral discretion, defines constrained meta-rules for
genuinely unforeseen events, and governs residual discretion through evidence,
conflicts rules, escalation, deadlines, correction windows, and finality.

This is an advisory semantic-hardening capability. It does not alter the
existing draft → define → source workflow, add a new MCP tool, redesign the
event-contract schema, or claim legal compliance.

Step (done):

1. Add the self-contained `reduce-semantic-risk` skill and align the packaged
   plugin metadata and user-facing documentation.

## Current integration decision: public ngrok test or Secure MCP Tunnel

The README documents two connection paths: an unauthenticated public ngrok
endpoint for simple ChatGPT tests, and the protected Secure MCP Tunnel using
`tunnel-client`. The public ngrok path is for test data only. OAuth and a
managed production endpoint remain outside the current scope.

## Target directory structure

```text
event-contract-builder/
├── .codex-plugin/
│   └── plugin.json              # ChatGPT/Codex plugin manifest
├── .mcp.json                    # Local HTTP MCP server connection
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
├── skills/                       # Packaged semantic workflow instructions
│   ├── draft-display-question/
│   │   ├── SKILL.md
│   │   └── references/drafting-spec.md
│   ├── define-terms/
│   │   ├── SKILL.md
│   │   └── references/definition-spec.md
│   ├── define-resolution-source/
│   │   ├── SKILL.md
│   │   └── references/source-spec.md
│   └── reduce-semantic-risk/
│       └── SKILL.md
├── server/
│   ├── src/
│   │   ├── tools/
│   │   │   ├── generate.ts
│   │   │   ├── validate.ts
│   │   │   └── convert.ts
│   │   ├── widget.ts            # Registers and serves the UI resource
│   │   ├── index.ts             # HTTP MCP server + tool registration
│   │   └── stdio.ts             # Stdio adapter for local MCP/tunnel clients
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

1. A packaged skill guides the model through semantic drafting and calls an
   MCP tool exposed by `server/` for each structured handoff.
2. The tool handler delegates schema validation and rendering to the server
   helpers and existing `src/` schemas.
3. The handler returns concise `content` plus typed `structuredContent`.
4. The tool descriptor points to a versioned widget resource URI.
5. The server registers that resource as `text/html;profile=mcp-app`, inlining
   `web/dist/app.js` and `web/dist/app.css`.
6. ChatGPT renders the resource in an iframe and sends tool inputs/results to
   the React widget through the MCP Apps JSON-RPC bridge.
7. Widget actions call MCP tools through `tools/call`; the widget does not
   duplicate validation or conversion logic.

The MCP server is HTTP-first and exposes `/mcp`. Stdio is not the primary
ChatGPT App transport, but a separate Stdio entrypoint is provided for local
MCP clients and tunnel clients that supervise a Stdio command. Local
development may use an HTTPS tunnel; production must expose a public HTTPS MCP
endpoint.

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
registers tools, and exposes the HTTP `/mcp` endpoint. `server/src/stdio.ts`
reuses the same factory over the SDK's Stdio transport; it must not emit
application logs on stdout because stdout is the MCP protocol channel.

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

No authentication, durable cross-restart persistence, billing, or external data
source is included in the first ChatGPT App increment. The workflow now has
session-scoped in-memory approved-contract memory as described above.

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
20. Add plugin manifest/package wiring for `skills/` and verify skill discovery
    and import in the host.
21. Add the standalone Stdio MCP entrypoint and verify it with a local MCP
    initialize/tools-list smoke test for tunnel-client compatibility.
22. Add the domain and connector-safe template draft-unit schemas with exact
    placeholder/variable validation and boundary tests.
23. Add deterministic rendering and structured-content tool coverage for
    template units.
24. Update packaged skill guidance and user-facing documentation for template
    draft units and their downstream handoff.
25. Add clickable source URLs to `propose_resolution_sources` and align its
    workflow guidance, documentation, and focused tests — done.
26. Add the standalone `reduce-semantic-risk` skill and align the packaged
    plugin metadata and user-facing documentation — done.
27. Add a maintained ngrok HTTP publication helper for an unauthenticated
    public HTTPS test endpoint, and document it alongside the retained Secure
    MCP Tunnel instructions — done.
28. Default to a rank-1 primary and rank-2 fallback in the proposal and
    submission source tools, align the workflow guidance and tests — done.
29. Allow an intentional primary-only hierarchy with an explicit warning while
    keeping two sources as the default — done.
30. Enforce independent source publishers and communicate missing fallback or
    primary coverage with intent-preserving alternative-market guidance — done.
31. Represent alternative markets as new selectable display-question units,
    route a selected alternative through term definition before re-evaluating
    its resolution sources, and add the corresponding tests — done.
32. Preflight proposal source links in the background and expose only links
    confirmed with HTTP 200 — done.
33. Translate deterministic English tool labels in the host model's response to
    the user's language without changing schema behavior — done.
34. Keep Turn 2 source URL checks while hiding individual statuses and
    `publiclyAccessible` metadata from rendered output; retain the aggregate
    unavailable-source warning and label the publication field `Publishing
Schedule` — done.
35. Add session-scoped approved-contract memory, carry a stable contract ID
    through the workflow, expose retrieval, and verify session isolation and
    retry behavior — done.
36. Recall only the selected unit and approved definitions/source records;
    exclude candidate drafts, follow-ups, and unselected alternatives from the
    retrieval projection — done.
37. Preserve per-session implicit isolation while allowing explicit
    `contract_id` bearer handoff between HTTP sessions, and verify the exact
    cross-session workflow — done.
38. Separate pending workflow submissions from approved contract memory: retain
    submitted stages only for handoff, add an explicit approval tool that the
    host calls after user confirmation, expose only approved stages through
    `get_approved_event_contract`, and cover the approval boundary in tests —
    done.
39. Treat selection of a drafted unit as its own pending and explicitly
    approved workflow stage before definition analysis, submission, or approval
    can begin; add the selection submission tool, update approval ordering and
    retrieval tests, and align the host workflow documentation — done.
40. Generalize resolution-source URL selection into a specificity ladder that
    distinguishes exact event locators, canonical source hubs, and supporting
    methodology references, while preserving the existing `url` schema and
    reachability checks — done.

## Verification

- `bun test`
- `bun run build`
- `bun run typecheck`
- `bun run cli -- --help`
- `bun run cli -- validate <fixture>`
- Start the server and verify `http://localhost:<port>/mcp` with MCP Inspector.
- Run the Stdio entrypoint and verify MCP `initialize` and `tools/list` over
  stdin/stdout without contaminating stdout with application logs.
- Verify the packaged skills are discoverable and the MCP server exposes only
  the five deterministic workflow tools.
- Retrieve the widget resource and confirm its MIME type is
  `text/html;profile=mcp-app`.
- Connect the HTTPS endpoint from ChatGPT developer mode and verify tool
  invocation, widget rendering, validation, and conversion.
- Verify that submitted definitions and detailed resolution sources remain
  pending until the host records explicit user approval, and that retrieval
  exposes only the approved stages.
- Verify that a selected draft unit remains pending until explicit selection
  approval and that definitions cannot be analyzed, submitted, or approved
  first.

## Deferred

- Schema redesign or new outcome types (except the approved product-name
  simplification and template draft-unit addition described above).
- OAuth 2.1 authentication and user accounts until the provider and
  client-registration strategy are selected.
- Durable contract storage across server restarts, authentication, and user
  accounts. The chat-scoped in-memory store described above is now in scope.
- External market or resolution-source integrations.
- App monetization and app-directory submission work beyond the metadata
  required to keep the implementation submission-ready.
- Guaranteed-fidelity rendering of the resolution-source hierarchy via the
  `web/` React widget (driven by `submit_resolution_source`'s
  `structuredContent`), replacing the current reliance on the host model to
  present localized Markdown faithfully. See the "Known limitation — host
  reformatting" note under the resolution-source step.
- A managed production tunnel or hosted deployment; the ngrok helper is for
  local development and testing only.
