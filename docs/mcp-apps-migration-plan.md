# MCP Apps migration plan

Design confirmed by the user on 2026-10-04 after grilling rounds Q1–Q14.
This plan covers `event-contract-builder` and the private `bleavit-foresight`
service.

## How to use this plan

Run one numbered session per engineering chat. Read the accepted design and
ownership map below, then only that session's entry points and prerequisite
handoff. Consult other stages' references only when the session touches them.

At each session's end, update its status in the table with changed paths,
validation results, contract/package versions, unresolved findings, and the
next session. Keep implementation details in their canonical code or instruction
owner; link to them from the handoff. This file records the migration decisions
and execution status rather than becoming another runtime instruction source.

The user acceptance gate after Session 6 is mandatory. Pilot refinement is
authorized; rollout to the remaining stages waits for explicit user acceptance.

## Branch workflow

Keep `integrate-mcp-app-ui` as the shared integration line in both repositories.
Session 1 is split at the agreed commit boundary: in `event-contract-builder`,
the integration branch starts at `92283382ccca1ffc13f6d2e3717c57904d05c14c`
and `integrate-mcp-app-ui-session-1` contains `823c09c8b1faf8d8c44e847b3e712a159700f2f5` and later session commits; in
`bleavit-foresight`, the integration branch starts at
`46c5ffd1d2198c263279c2cab3dde7b52cc4c5f2` and
`integrate-mcp-app-ui-session-1` contains
`027b435f2d485849af66995157b36eb27315f80b` and later session commits.

For each subsequent session, create `integrate-mcp-app-ui-session-X` from
`integrate-mcp-app-ui`, where `X` is the session number. Keep that session's
commits on its branch for inspection; integrate them into
`integrate-mcp-app-ui` only after review. Do not push unless the user asks.

| Session | Deliverable                                         | Requires                 | Status                       |
| ------- | --------------------------------------------------- | ------------------------ | ---------------------------- |
| 1       | Portable protocol and build spike                   | Confirmed design         | Complete — see handoff below |
| 2       | Shared stage, workspace, and action contracts       | 1                        | Pending                      |
| 3       | Durable working drafts and revision-safe state      | 2                        | Pending                      |
| 4       | Shared commands, presentation, and core adapter     | 3                        | Pending                      |
| 5       | Site-styled app shell and MCP resource              | 1, 4                     | Pending                      |
| 6       | Complete question-drafting pilot                    | 5                        | Pending                      |
| 7       | User review, refinement, and acceptance gate        | 6                        | Pending                      |
| 8       | Terms and resolution-source stages                  | Explicit acceptance in 7 | Pending                      |
| 9       | Criteria, background, and optional news             | 8                        | Pending                      |
| 10      | Completion, exports, feedback, and lifecycle parity | 9                        | Pending                      |
| 11      | Portability, packaging, and release verification    | 10                       | Pending                      |

## Accepted design

### App experience and portability

One saved forecast has one reusable workspace interface. Reopen it with the
latest state at each newly generated review checkpoint and on a chat request.
Several iframe instances may represent that same record; none owns the record.
The host decides placement and whether it creates a view or reuses a panel.
Offer fullscreen or picture-in-picture only when advertised by the host.
There is no portable guarantee of pinning, scrolling, or refreshing old views.

Use the MCP Apps standard and official compatible SDK, with no provider-specific
runtime bridge or UI API. Detect capabilities rather than provider names.
Unsupported clients retain the complete MCP core chat workflow; partial support,
denied app calls, and render failures have a usable core route. Provider-specific
distribution metadata already in the repositories remains separate from the
portable runtime.

Chat performs research and drafting using the existing semantic skill owners.
After approval, an explicit **Continue** action requests the next stage through
standard app-to-host messaging. If unavailable or unsuccessful, show an equivalent
chat instruction. Message delivery does not prove generation has started or ended.
Optional-news consent stays explicit.

### Editing, proposals, and approval

Users edit prose where it appears, with structured controls for dates, sources,
lists, and other typed data. Generated headings, status, and workflow metadata
are separate. Structured data remains authoritative; rendered Markdown is not
parsed back into workflow state.

Autosave preserves incomplete working drafts, shows field validation errors, and
never approves content. Approval flushes pending saves, requires a valid draft,
and atomically checks the exact saved revision and prerequisite revisions.
Candidate selection has the same protection: selecting or editing a candidate
alone does not approve it; an explicit select-and-approve action may combine the
two operations.

Initial generation can fill an empty stage. Subsequent model output is a proposal
with **Apply** and **Discard**. Applying changes the working draft without
approval. Bind generation and proposal application to their base revisions so
late output cannot replace newer user edits.

On conflicts, preserve local unsaved edits, retrieve the newer saved version,
and require reconciliation. Never silently merge or overwrite. Reopening fetches
canonical server state; iframe memory and model context are not persistence.

Keep the previous approved version while its replacement is being edited. On
replacement approval, retain dependent work but mark it outdated until renewed
review against the current prerequisites. Completion and exports exclude
outdated content. Make the distinction between the approved version and an
unapproved working draft visible.

### Maintenance target and protocol policy

There are no production clients or valuable production records to preserve.
Drop backward compatibility to keep the code lean: do not add 2025 protocol
transports, old payload adapters, or old-record migration machinery. Future
sessions may replace development payloads and records directly. Keep modern
core-only clients fully supported; MCP Apps rendering remains optional.

The target is **zero feature-specific fallback implementation**, not zero adapter
maintenance. Design features for the app first, encode their meaning once in a
shared stage/action contract, and derive both presentations from it:

```text
App feature design
        |
Shared stage definitions + domain schemas + action definitions
        |
Server state and command engine
        |
Typed presentation document + available actions + revisions
       / \
App renderer   Generic core text/structured adapter
```

The shared definitions own field identity, labels, ordering, control kinds,
validation references, and action meaning. The server owns state-dependent
availability and results. Both renderers consume the same semantic presentation
document; actions from either client execute the same commands. Existing tool
names become adapters where practical rather than a second workflow engine.
Existing nuanced research and drafting guidance stays in skills/references.

Adding a stage or field supported by existing primitives must not require a
stage-specific core renderer, handler, or parallel instructions. A new UI primitive
needs one generic text representation; a purely visual enhancement need not
imitate inline interaction in chat. App and core must expose equivalent domain
content, validation, actions, and resulting state.

Core hosts can still paraphrase assistant output. Guarantee canonical server
reviews and revision-bound approval, without promising verbatim host prose.
Preserve the complete core workflow and existing names where practical; updated
or versioned payloads are authorized. Missing or stale revision information must
produce a recoverable review/retry path, not weaker approval semantics.

## Ownership and entry points

Preserve [the repository boundary](repository-boundary.md) and follow
[repository maintenance instructions](../AGENTS.md).

| Owner                              | Existing entry points                                                                                | Migration responsibility                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Public contracts                   | `src/foresight/tools.ts`, `workflow.ts`, domain schema modules, `index.ts`                           | Typed workspace/action/presentation contracts; field descriptors and tool interface |
| Public instructions                | `src/foresight/instructions.md`, affected `skills/*/SKILL.md` and linked references                  | Shared routing and stage-specific semantic guidance in their existing owners        |
| Public appearance and distribution | `site/styles.css`, `site/assets/foresight-icon.png`, `scripts/build.ts`, `scripts/package-plugin.py` | Canonical site styling inputs, exported assets/contracts, packaging                 |
| Private service                    | `../bleavit-foresight/server/src/server.ts`, `worker.ts`, `tools/*`                                  | MCP registration, capability handling, command adapters, model handoff              |
| Private state                      | `../bleavit-foresight/server/src/approved-forecast-specification-store.ts`, `d1-record-store.ts`     | Drafts, approvals, dependency revisions, persistence                                |
| Private presentation               | `../bleavit-foresight/server/src/render.ts`, new app/presentation modules                            | Shared projection, generic fallback, widget implementation and built HTML           |

Public contracts are consumed through a versioned package artifact. Use the
private repository's existing package update workflow when these change.
Choose concrete new module paths in the relevant session; record the owner in
its handoff rather than adding parallel copies of these responsibilities.

## Session 1 — Verify the portable foundation

**Read:** private `package.json`, `server/src/server.ts`, `worker.ts`, `stdio.ts`,
`wrangler.toml`; public build and packaging scripts; the official sources below.

**Work:**

- Pin an MCP Apps SDK release compatible with the current MCP SDK and Worker
  environment. Verify installed releases; examples and protocol versions are
  not interchangeable. Use the latest stable SDK and its current protocol only.
- Build a minimal local UI resource/tool round trip using the standard MIME,
  `ui://` resource, tool metadata, capability negotiation, and iframe handshake.
  Check stdio and the stateless HTTP path, including resource reads.
- Verify direct tool calls, model-context updates, messaging, display modes,
  teardown, and resource CSP against the host's advertised capabilities.
- Establish a reference host/harness and a core-only client. Distinguish standard
  behavior from actual host support and record observed limitations.
- Choose a small UI stack and self-contained HTML build that works under the
  service deployment model. Keep assets bundled where practical and declare
  only necessary CSP permissions.

**Done when:** the same server serves usable core output without app support and
a functioning standard app in the reference host; dependency/build choices and
the actual support matrix are recorded. No provider runtime extensions are used.

### Session 1 handoff — 2026-10-04

Completed the opt-in, read-only protocol spike in the private service. No forecast
state, stage contracts, approvals, public package exports, or production deployment
changed. Session 2 is next.

**Current versions and build choice (updated at the user's request):**
`@modelcontextprotocol/server`, `client` and `core` are pinned to **2.3.0**;
`@modelcontextprotocol/node` to **2.1.1**; and `@modelcontextprotocol/ext-apps`
to **2.0.3**. Zod is **4.6.5**. Bun **1.3.13** and Wrangler **4.145.0** remain
unchanged. The initial spike used SDK 1.29.0 / Apps 1.7.5; the user subsequently
authorized upgrading before Session 2. SDK v2 is the stable line, and Apps 2.x
retains the **2026-01-26** iframe protocol. See the official
[SDK status](https://github.com/modelcontextprotocol/typescript-sdk),
[SDK migration guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md)
and [Apps migration guide](https://apps.extensions.modelcontextprotocol.io/api/documents/migrate-to-v2.html).

**Protocol policy:** every MCP entry point (Node HTTP, Cloudflare Worker and
stdio) serves only **2026-07-28**, the current protocol in stable SDK v2.
HTTP uses `createMcpHandler` (Node through `toNodeHandler`); stdio uses
`serveStdio`, all configured with `legacy: "reject"`. Legacy 2025 connections
are rejected. The legacy transports, Node session map and Worker fallback branch
have been removed. Modern requests carry capabilities individually.
See the official [protocol entry-point guidance](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md).

Compatible transitive security pins in the private `package.json` select Hono
**4.13.13** and its Node adapter **1.19.17**; the latter stays within the SDK
adapter's 1.x range. A Zod **4.6.5** override keeps all schemas on one version.
A clean frozen-lockfile install and `bun audit` pass with **no reported
vulnerabilities**. This is a dependency audit result, not a service-security
certification. Recheck the overrides when updating the SDK's dependency ranges.
Bundled notices now retain the v2 SDK's Apache-2.0/MIT license text.

The public artifact remains `event-contract-builder` **0.4.0**, with existing
vendor digest `782a7492c8e75d92242741f9ee0298b4f16a1939361ddf3797c6b8f45644900c`.
No package refresh or new contract version was needed.

Choose vanilla TypeScript and the existing Bun bundler. Inline scripts and CSS
produce self-contained HTML with bundled dependency license notices. The build
also emits an importable HTML string module for the Worker bundle, so resource
reads require neither filesystem access nor an asset origin. Resource metadata
requests no external connections, assets, nested frames, or special permissions.
The spike's temporary appearance is not the site-styled shell scheduled for
Session 5.

**Canonical private owners and changed paths:**

- `server/src/apps/spike.ts`: `ui://foresight/protocol-spike.html` registration,
  standard MIME, tool metadata, bounded echo and complete core output.
- `server/app/spike.{ts,html}`: SDK App lifecycle and capability-aware controls;
  `server/app/harness.{ts,html}`: local SDK AppBridge reference host.
- `scripts/build-app.ts`: HTML and notices derived from actual build inputs,
  including transitive dependencies;
  `scripts/app-spike-host.ts`: local stateless Worker handler harness.
- `server/src/server.ts`, `stdio.ts`, `worker.ts`: protocol entry points and opt-in registration via
  server option or `FORESIGHT_APP_SPIKE=1`; default discovery stays unchanged.
- `package.json`, `bun.lock`, `tsconfig.json`, `server/app/tsconfig.json`,
  `wrangler.toml`: dependency, build-before-run/check/test and browser type checks.
- `server/test/app-spike.test.ts`: transport, negotiation, bridge, denial,
  lifecycle, modern core behavior and generated-module parsing checks.
- `server/test/protocol-rejection.test.ts`: unsupported-protocol rejection on
  Node HTTP, Worker HTTP and actual stdio.
- `server/src/index.ts`, `server/src/tools/*`: v2 imports;
  `server/test/interface-integration.test.ts`: modern-only protocol workflows and
  durable Worker recall; `server/test/d1-test-binding.ts`: shared test adapter;
  other affected tests use the SDK v2 discovery behavior and JSON Schema 2020-12.

**Runnable reference:** from the private repository, run `bun run dev:app-spike`
and open `http://127.0.0.1:8790`. Use its Full, Partial, Denied message, Denied
tool and Resource failure profiles. For stdio, build the app then run
`FORESIGHT_APP_SPIKE=1 bun run start:server:stdio`. The local Worker emulator can
be started with `bun x --no-install wrangler dev --local --port 8791 --var
FORESIGHT_APP_SPIKE:1`. These are development probes; no model or forecast record
is created.

| Configuration                                              | Observed support                                                                                 | Limits                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Official SDK Client, core-only, in memory and actual stdio | Discovery, resource reads, usable text/structured echo                                           | No app rendering promised                                                                                         |
| Official SDK Client with UI extension                      | Standard MIME negotiation and tool/resource linkage                                              | Negotiation is separate from iframe capabilities                                                                  |
| Modern Worker handler, local workerd and stdio             | Resource reads, app-capable echo, complete workflow and durable Worker recall pass on 2026-07-28 | Per-request capabilities preserve app support without initialization state                                        |
| Browser iframe + official App/AppBridge local harness      | Handshake, initial result notification, direct tool calls, context updates, messages, teardown   | Context/messages are logged; acceptance does not run a model                                                      |
| Full harness display modes                                 | Inline, fullscreen and pip requests acknowledged                                                 | Placement changes are simulated responses, not a demonstrated host layout or OS picture-in-picture implementation |
| Partial harness                                            | Context/message controls disabled; only advertised inline mode offered                           | Tool and core routes remain usable                                                                                |
| Denied message/tool and missing resource                   | Visible failure and equivalent core instruction                                                  | No automatic generation or provider-specific retry bridge                                                         |
| Resource security                                          | Empty CSP allowlists returned; local iframe uses `allow-scripts` and restrictive CSP             | Local harness is a protocol test fixture, not a production sandbox/security certification                         |
| Independent production app hosts                           | Unverified                                                                                       | Codex's browser displayed our harness; this does not establish native Codex, ChatGPT or Claude MCP Apps support   |

**Validation:** private `bun run test` passed **64 tests**, including the full
modern Node HTTP, stdio and durable Worker forecast workflows, plus rejection
of 2025 connections on all three entry points; `bun run check` passed both server
and browser checks. Wrangler deployment **dry-run** built the Worker successfully;
a separate MCP client negotiated the modern protocol, read the resource and
called the app-capable echo tool in local workerd. Browser inspection exercised echo, context, messaging/denial, denied tool
calls, partial capabilities, resource failure, reopening and graceful teardown.
The widget was visually inspected in the narrow in-app browser. Scoped Prettier
and `git diff --check` passed. Standards/spec review found no blocking changes.

**Follow-ups:** use per-request capabilities for modern clients; do not gate
essential domain actions or core output on app support.
The later shell must handle real host placement and generation status independently.
Actual independent host support stays unverified until tested in Session 11.
Session 2 should define the shared contracts; do not turn this echo probe into a
second domain command path.

## Session 2 — Define the shared contract

**Read:** public `tools.ts`, `workflow.ts`, question/unit schemas and exports;
private registration and existing interface integration tests; Session 1 handoff.

**Work:**

- Introduce bounded, typed workspace, presentation, field, action, and command
  contracts. Start with the question-drafting pilot and primitives needed by
  later schemas; avoid building a general-purpose form platform.
- Distinguish editable incomplete values from valid domain submissions. Keep
  strict domain validation intact. Give repeated rows stable identities and
  validation errors stable field paths.
- Define snapshot/reopen, draft edit, proposal submission/application/discard,
  select-and-approve, approval, and Continue intent interfaces. Include expected
  revision, prerequisite bindings, command identity, and recoverable conflicts.
- Decide the versioned envelope for strict existing outputs. Reject missing required revisions and obsolete payloads; use canonical
  schemas rather than duplicating payload details in skills.
- Keep internal IDs/revision tokens available to clients and the model where
  necessary but separate from user-facing forecast prose and exports.

**Done when:** representative pilot data, incomplete edits, actions, and errors
validate through public contracts; a modern core integration exercises the current contracts; public and private interface tests agree on the package artifact.

## Session 3 — Implement durable revision-safe state

**Read:** private store, D1 store, their tests, submission/approval handlers;
Session 2 contracts. Load only the invariants affected by persistence changes.

**Work:**

- Separate working drafts, approved snapshots, and model proposals. Track
  stage/candidate revisions and the approved prerequisite revisions each
  downstream version depended on.
- Persist incomplete drafts and expose resumable pending snapshots. Preserve
  draft-only records; define saving, saved, failed, and conflict outcomes.
- Implement atomic revision checks for edits, proposal application, selection,
  and approval. Retried commands must not duplicate approvals or transitions.
  Existing database concurrency checks remain necessary but are insufficient
  for a stale widget or a late generation result.
- Retain approved versions during editing and mark retained dependent content
  outdated on replacement approval. Derive valid progression and publication
  eligibility from dependencies, rather than old approval flags alone.
- Replace disposable development records as needed. Preserve language
  locking, separate-record rules, deletion, retention, and explicit record IDs
  across stateless requests. Require explicit consent in current state.
- Scope stored revisions/proposals and payload limits to avoid unbounded history.
  Preserve recoverable user work on failed saves and host teardown.

**Done when:** tests cover incomplete autosave, reload, two stale views, late
generation, duplicate requests, stale candidate selection, replacement approval,
outdated downstream retention, and fresh-record persistence. App and core
commands produce the same persisted transitions.

## Session 4 — Build one command and presentation path

**Read:** private `tools/*`, `render.ts`, `review-validation.ts`, integration
tests; public stage/action contracts and affected runtime instructions.

**Work:**

- Extract domain commands and one stage-to-presentation projection from handlers.
  Have core tools and app-facing calls delegate to this same engine.
- Build generic text/structured rendering from shared presentation primitives.
  Source action labels, field order, errors, and availability from the contract
  and current state. Return meaningful core `content` even for app-linked tools.
- Expose reopening/snapshot and equivalent edit, proposal, approval, and Continue
  operations to core clients. An app-only visibility restriction must not make
  a domain feature unreachable through the core workflow.
- Return canonical revision-bearing reviews. Reject approvals missing required revisions
  with instructions to fetch/review and retry; avoid changing strict outputs
  accidentally. Remove approval bypasses from exact-match candidate submission.
- Move shared routing to runtime instructions and update pilot skill routing
  only where behavior changed. Preserve its semantic drafting reference.

**Done when:** one pilot transcript works through core alone, including edits,
Apply/Discard, exact selection approval and explicit Continue. A parity test
compares content/actions and resulting state rather than pinning long prose.
Changing a supported pilot field requires no separate fallback implementation.

## Session 5 — Build the workspace shell

**Read:** Session 1 build/support findings; public site CSS/icon; private server,
Worker and presentation modules; current official app lifecycle documentation.

**Work:**

- Serve the built app resource through MCP and link it from workspace/review
  tools. Register lifecycle/result handlers before connecting.
- Implement opening, loading, pending/approved/outdated status, stage navigation,
  errors, and current snapshot recovery. Render shared presentation primitives.
- Reuse site styling through canonical exported tokens/assets or a shared
  stylesheet. Preserve its warm neutral background, gold accents, typography,
  cards, focus treatment, and responsive proportions. Avoid importing unrelated
  marketing layout; adapt contrast and dimensions to host context.
- Fetch current state when opened/reactivated and offer refresh. Detect stale
  views before writes; do not assume older widgets receive subsequent results.
- Support advertised display modes and clear core routes for absent/denied
  capabilities. Keep external content escaped and source links inert until used.

**Done when:** the workspace opens repeatedly against the same record, recovers
after teardown/reload, responds to constrained widths and themes, and remains
usable by keyboard. Visual review confirms that it matches the site style.

## Session 6 — Complete the first-stage pilot

**Read:** question/unit contracts, question-drafting skill and its linked
drafting reference, draft/selection handlers, shared shell and command engine.

**Work:**

- Deliver the complete entry flow: user event in chat, initial candidate
  generation, workspace review, prose/structured edits, candidate selection,
  exact saved select-and-approve, and explicit Continue to definitions.
- Implement debounced autosave with ordered writes and visible save state.
  Disable approval until saves are acknowledged and validation passes. Handle
  incomplete fields, retry, local edit preservation, and conflict reconciliation.
- Deliver proposal Apply/Discard and base-revision handling. Make differences
  reviewable without replacing the active draft first.
- Synchronize a compact saved-state summary into model context when supported.
  Continue supplies record, language, approved revision, and next-stage intent;
  semantic generation still uses the existing skill owner.
- Reopen the workspace at review checkpoints. Provide equivalent core operations
  and chat instructions for unsupported hosts and unsuccessful handoffs.

**Done when:** the end-to-end pilot passes app and core scenarios, including
invalid autosave, reopening, stale approval, two widgets, late AI rewrite,
Apply/Discard and denied messaging. The first-stage UX is ready for user review;
implementation of later-stage widgets has not started.

## Session 7 — Review and acceptance gate

**Read:** pilot handoff and its runnable review instructions; affected pilot
modules only when diagnosing review findings.

**Work:** give the user a runnable pilot and representative saved forecast.
Demonstrate editing, save recovery, exact approval, conflicts, AI proposals,
Continue, and core fallback. Refine the pilot based on review and rerun checks
affected by changes. Present concrete evidence of host support and limitations.

**Done when:** the user explicitly accepts the pilot as the interaction pattern
for remaining stages. Record that acceptance and outstanding bounded follow-ups.
If acceptance is pending, continue pilot refinement only; Sessions 8–11 remain
gated. Passing automated tests is not acceptance.

## Session 8 — Extend to terms and resolution sources

**Read:** accepted pilot contract/components; terms and resolution-source schemas,
handlers, skills and their directly linked relevant references.

**Work:** migrate terms, then sources as two bounded iterations. Add dictionary
or list controls and source hierarchy/condition controls through shared
primitives. Preserve source validation, stage prerequisites and research policy.
For each stage, implement the shared definition, hook up the generic app/core
path, and test editing, approval, proposals and dependency invalidation before
starting the next stage.

**Done when:** both stages follow the accepted pilot pattern and all domain
actions remain available in core. No stage-specific fallback renderer or parallel
semantic guidance was introduced. Capture any primitive additions in the handoff.

## Session 9 — Extend to criteria, background and news

**Read:** only the current stage's schema, handler, skill/reference, and approved
prerequisite bindings. Treat the three stages as separate bounded iterations.

**Work:** migrate criteria, then background, then news. Preserve exact question/
condition identity and criteria semantics; retain background and news research
requirements. Store explicit optional-news choice and represent declined, empty,
unavailable, and approved outcomes consistently. Support source/date editing and
news ordering with shared controls. Exercise revisions of earlier stages with
retained outdated downstream drafts.

**Done when:** each stage passes domain and app/core parity tests, news is never
requested before opt-in, and outdated work requires review against current
prerequisites. The stage definitions contain no duplicate core implementation.

## Session 10 — Complete the surrounding workflow

**Read:** runtime completion/export/feedback instructions; approved lookup and
feedback handlers, renderer, feedback store and tests.

**Work:** derive completion actions from shared state; migrate Markdown, YAML,
and JSON exports, recall, separate/translated records, deletion and feedback
routing. Preserve the existing export confirmation and privacy/explicit-submit
boundaries in their canonical owners. Bind displayed export confirmation to the
exported revision; edits make an earlier confirmation stale. Use a standard
copy/text route everywhere and capability-supported downloads only as an
enhancement. Preserve existing feedback channels without automatic sending.

**Done when:** completion, exports, confirmation, feedback notice/consent,
deletion, reload and separate-record behavior work through both experiences.
Exports contain only valid approved content and exclude internal metadata;
outdated dependencies cannot produce a falsely complete specification.

## Session 11 — Verify portability and prepare release

**Read:** accumulated support/handoff results, public/private package scripts,
deployment configuration, changed instruction owners and public README.

**Work:**

- Test reference-host behavior, available independent app hosts, core-only
  clients, partial/denied capabilities, resource/load failure, and teardown.
  Record tested versions and limitations; report unavailable hosts as unverified.
- Exercise both transports, packaged HTML/assets, resource security metadata,
  stateless record recovery, concurrent saves and revision-safe modern core
  payloads. Test injection-safe rendering and relevant accessibility.
- Verify the maintenance claim by adding/changing a supported field/action in a
  shared test fixture and observing both adapters update with no fallback edit.
  Keep reusable parity tests rather than a production demonstration field.
- Update high-level setup/capability documentation and affected canonical
  instructions. Remove contradictory automatic-continuation/approval wording
  at its owner; keep stage research rules in their references.
- Build versioned public/private artifacts and check packaging boundaries,
  notices and asset inclusion. Prepare a staged deployment and recovery plan for the new storage format;
  no legacy-record compatibility is required. Finish with a concrete release review, without automatically
  publishing or deploying as part of this plan.

**Done when:** the recorded matrix passes for supported configurations, both
experiences use one state/command path, every supported feature has a core
equivalent, and release artifacts plus recovery evidence are reviewable.

## Validation and handoff rules

Apply the existing repository checks proportionally in each session, rather
than postponing validation to release:

- Public TypeScript/schema changes: `bun run test` and `bun run check`.
- Private runtime changes: `bun run test` and `bun run check`; add targeted
  persistence, protocol or UI tests for the behavior changed.
- Changed skills: installed skill-creator `quick_validate.py`, plus linked
  reference checks, as required by public `AGENTS.md`.
- Changed Markdown/instructions/code: scoped Prettier and `git diff --check`.
- UI sessions: render and visually inspect the actual widget, including narrow
  width, keyboard use, saving/errors and advertised display modes.

Keep parity assertions about semantic content, available actions, revision
bindings and persisted results. Assert canonical review output at the server
boundary; do not test a promise that the host assistant repeats it verbatim.

## Official references for Session 1 and protocol changes

- [MCP Apps stable specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx): extension negotiation, resource/tool linkage, visibility, lifecycle, display modes and security metadata.
- [Official SDK and release source](https://github.com/modelcontextprotocol/ext-apps): choose a release compatible with the repository's installed MCP SDK.
- [App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html): server-tool calls, model-context updates, messaging and display requests.
- [Host context API](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiHostContext.html): optional styles, dimensions, theme and supported display modes.
- [MCP Apps patterns](https://apps.extensions.modelcontextprotocol.io/api/documents/Patterns.html): persistent user work, lifecycle and integration patterns.
