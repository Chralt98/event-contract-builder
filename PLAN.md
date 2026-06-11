# event-contract-builder: Library + CLI + MCP Server

## Context

The goal is to build out the actual product described in the README: tooling for generating YAML/JSON **event contract specifications for prediction markets**.

- **Schema**: a generic, exchange-agnostic event contract spec covering event metadata, outcome type, resolution info, schedule, optional contract terms, and status.
- **Layout**: single package, multiple entry points — no monorepo.
- **Scope**: library + CLI + MCP server, each supporting **generate**, **validate**, and **convert** (YAML ⇄ JSON).
- **Type strategy**: Zod v4 schemas are the runtime source of truth; TS types come via `z.infer`. Thin hand-written interfaces (`extends` the inferred type) carry the public-facing JSDoc.

Verified during research (using the installed `zod@4.4.3` and `@modelcontextprotocol/sdk@1.29.0`):
- `.refine()` on a member schema works fine inside `z.discriminatedUnion()` — confirmed with a live test.
- `z.iso.datetime({ offset: true })` exists and validates ISO 8601 datetimes correctly.
- `McpServer.registerTool(name, config, cb)` accepts `inputSchema` as a **raw Zod shape object** (`Record<string, ZodType>`), not a `z.object(...)` — the SDK builds the JSON schema and validates internally.

## Directory structure to create

```
event-contract-builder/
├── index.ts                  # barrel: re-export src/schema + src/lib (package "." entry)
├── package.json               # add bin, exports, scripts
├── src/
│   ├── schema/
│   │   ├── outcome.ts          # Binary/Categorical/Scalar outcome schemas + discriminated union
│   │   ├── resolution.ts        # ResolutionSource, ResolverType, ResolutionInfo
│   │   ├── schedule.ts          # Schedule (open/close/expiration/settlement, ISO 8601)
│   │   ├── contract-terms.ts    # Optional ContractTerms (tickSize, currency, limits...)
│   │   ├── event-contract.ts    # Top-level EventContractSpecSchema + ContractStatus
│   │   ├── types.ts             # Hand-written JSDoc interfaces extending z.infer types
│   │   └── index.ts             # barrel re-export
│   ├── lib/
│   │   ├── builder.ts           # createEventContract(), per-type scaffold defaults
│   │   ├── serialize.ts         # toYaml/toJson/parseYaml/parseJson/detectFormatFromPath
│   │   ├── validate.ts          # validateEventContract(), formatValidationIssues()
│   │   ├── convert.ts           # convertContract() YAML<->JSON with validation
│   │   └── index.ts             # barrel re-export
│   ├── cli/
│   │   ├── args.ts               # parseArgs wrapper (node:util)
│   │   ├── io.ts                  # Bun.file/Bun.write + stdin/stdout helpers
│   │   ├── commands/
│   │   │   ├── generate.ts
│   │   │   ├── validate.ts
│   │   │   └── convert.ts
│   │   └── main.ts                # subcommand router + shebang
│   └── mcp/
│       ├── server.ts              # createServer(): McpServer with tools registered
│       ├── main.ts                 # stdio bootstrap + shebang
│       └── tools/
│           ├── generate.ts
│           ├── validate.ts
│           └── convert.ts
└── test/
    ├── schema/{outcome,event-contract}.test.ts
    ├── lib/{builder,validate,convert}.test.ts
    ├── cli/commands.test.ts
    ├── mcp/tools.test.ts
    └── fixtures/{valid-binary.yaml, valid-categorical.json, valid-scalar.yaml, invalid-missing-fields.yaml}
```

## Schema design (`src/schema/`)

All fields get `.describe(...)` for JSON-schema/MCP/IDE hints. Top-level type is `EventContractSpec`.

- **`outcome.ts`**: `CategoricalOptionSchema` (id/label/description), `BinaryOutcomeSchema` (`type: "binary"`, `yesLabel`/`noLabel` defaults "Yes"/"No"), `CategoricalOutcomeSchema` (`type: "categorical"`, `options` min 2, `allowMultipleWinners` default false), `ScalarOutcomeSchema` (`type: "scalar"`, `unit`, `minValue`, `maxValue`, `tickSize` positive, `.refine(maxValue > minValue)`). Combine via `OutcomeSchema = z.discriminatedUnion("type", [...])`.
- **`resolution.ts`**: `ResolutionSourceSchema` (name, optional `url` via `z.url()`), `ResolverTypeSchema = z.enum(["exchange","third-party","oracle","governance-vote"])`, `ResolutionInfoSchema` (criteria, sources min 1, resolverType).
- **`schedule.ts`**: `ScheduleSchema` with `timezone` (default "UTC"), `openDate`/`closeDate`/`expirationDate`/`settlementDate` all `z.iso.datetime({ offset: true })`, `.refine(closeDate > openDate)`.
- **`contract-terms.ts`**: `ContractTermsSchema` — all-optional (`.partial()`): `tickSize`, `contractUnit`, `settlementCurrency` (3-char), `minOrderSize`, `maxOrderSize`, `positionLimit`.
- **`event-contract.ts`**: `ContractStatusSchema = z.enum(["draft","proposed","active","closed","settled","cancelled"])`. `EventContractSpecSchema`: `specVersion` (literal `"1.0"`, default), `id`, `slug` (lowercase-hyphen regex), `title`, `description`, `category`, `tags` (default `[]`), `outcome` (OutcomeSchema), `resolution`, `schedule`, `contractTerms` (optional), `status` (default "draft"), `metadata` (optional `z.record(z.string(), z.unknown())`).
- **`types.ts`**: For `EventContractSpec`, `Outcome`, `ResolutionInfo`, `Schedule` — `export interface X extends InferredX {}` with rich JSDoc (`@remarks`, `@example`) for editor hover docs. Zod schema remains the runtime source of truth; this is purely a documentation layer and stays structurally guaranteed compatible.
- **`index.ts`**: barrel `export *` of all of the above.

## Library API (`src/lib/`)

- **`serialize.ts`**: `toYaml(spec)`, `toJson(spec, pretty?)`, `parseYaml(text): unknown`, `parseJson(text): unknown`, `detectFormatFromPath(path): "yaml"|"json"|undefined`. Use the `yaml` package for YAML.
- **`validate.ts`**: `validateEventContract(data: unknown): ValidationResult` (`{success:true,data}` or `{success:false,errors: ValidationIssue[]}`) using `EventContractSpecSchema.safeParse`, mapping `result.error.issues` to `{path, message}` (path joined with `.`/`[n]`). `formatValidationIssues(issues)` → multi-line string.
- **`builder.ts`**: `createEventContract(input: DeepPartial<EventContractSpec>): EventContractSpec` — deep-merges nested objects (outcome/schedule/resolution) so partial input doesn't clobber siblings, then `EventContractSpecSchema.parse()` (lets Zod defaults fill in `specVersion`/`status`/`tags`/outcome labels/etc.); throws a clear error listing missing required fields otherwise. Plus `createBinaryContractDefaults()`, `createCategoricalContractDefaults()`, `createScalarContractDefaults()` returning minimal valid scaffolds (placeholder id/slug/title/description/category/resolution/schedule + the relevant outcome shape).
- **`convert.ts`**: `convertContract(input: string, to: "yaml"|"json", options?: {from?, pretty?}): ConvertResult` — parses (auto-detects YAML vs JSON if `from` omitted), validates via `validateEventContract`, and on success serializes to `to` format.
- **`index.ts`**: barrel re-export.

## CLI (`src/cli/`)

Use **`node:util`'s `parseArgs`** (built into Bun, zero new deps) wrapped in `src/cli/args.ts`.

```
event-contract-builder generate [-i input] [-o output] [-f yaml|json] [--type binary|categorical|scalar]
event-contract-builder validate <file> [-f yaml|json]
event-contract-builder convert <file> -t yaml|json [-o output] [-f from-format] [--pretty]
```

- `src/cli/io.ts`: `readInput(path?)` via `Bun.file(path).text()` or `Bun.stdin.text()`; `writeOutput(path?, content)` via `Bun.write` or `process.stdout.write`.
- `src/cli/commands/{generate,validate,convert}.ts`: thin wrappers calling `src/lib` functions; `validate` exits 1 with issues on stderr if invalid.
- `src/cli/main.ts`: routes `process.argv[2]` to the right command, handles `-h/--help`, `-v/--version`. Starts with `#!/usr/bin/env bun` shebang.

## MCP server (`src/mcp/`)

- `src/mcp/server.ts`: `createServer()` builds `new McpServer({name:"event-contract-builder", version:"0.1.0"})` and calls `registerGenerateTool`/`registerValidateTool`/`registerConvertTool`.
- `src/mcp/main.ts`: connects `createServer()` to `StdioServerTransport`. Shebang `#!/usr/bin/env bun`.
- Each `src/mcp/tools/*.ts` exports `register*Tool(server)` using `server.registerTool(name, {description, inputSchema: <raw zod shape>}, handler)`, delegating to `src/lib`:
  - `generate_event_contract`: input `{ input?: string, inputFormat?: "yaml"|"json", outcomeType: "binary"|"categorical"|"scalar" (default "binary"), outputFormat: "yaml"|"json" (default "yaml") }` → returns generated spec text; `isError` + formatted issues on failure.
  - `validate_event_contract`: input `{ document: string, format?: "yaml"|"json" }` → success summary or `isError` + issues.
  - `convert_event_contract`: input `{ document: string, from?: "yaml"|"json", to: "yaml"|"json", pretty?: boolean (default true) }` → converted text or `isError` + issues.

## package.json changes

- Add `"types": "./index.ts"`.
- `"bin"`: `{ "event-contract-builder": "./src/cli/main.ts", "ecb-mcp-server": "./src/mcp/main.ts" }`.
- `"exports"`: `"."` → `index.ts`; `"./schema"` → `src/schema/index.ts`; `"./lib"` → `src/lib/index.ts`; `"./mcp-server"` → `src/mcp/server.ts`.
- `"scripts"`: `"cli": "bun run src/cli/main.ts"`, `"mcp": "bun run src/mcp/main.ts"`, `"test": "bun test"`, `"typecheck": "tsc --noEmit"`.
- No new dependencies required.
- Update root `index.ts` to be a barrel re-exporting `src/schema/index.ts` and `src/lib/index.ts` (replacing the "Hello via Bun!" placeholder).

## Tests (`bun test`)

- `test/schema/outcome.test.ts`: defaults, categorical min-2 rule, scalar min/max + tickSize validation, discriminated union narrowing/rejection.
- `test/schema/event-contract.test.ts`: full valid spec parses with defaults filled; invalid slug rejected; `closeDate <= openDate` rejected.
- `test/lib/builder.test.ts`: each `create*ContractDefaults()` → `createEventContract` produces valid spec; missing-required-fields error is clear; deep-merge doesn't clobber sibling sections.
- `test/lib/validate.test.ts` & `test/lib/convert.test.ts`: round-trip YAML↔JSON on fixtures, error reporting on `invalid-missing-fields.yaml`.
- `test/cli/commands.test.ts`: call command functions directly for generate/validate/convert; one `Bun.spawn` smoke test of `src/cli/main.ts`.
- `test/mcp/tools.test.ts`: `createServer()` + SDK `InMemoryTransport` to call each tool with valid/invalid input, asserting `content`/`isError`.
- Fixtures under `test/fixtures/`: `valid-binary.yaml`, `valid-categorical.json`, `valid-scalar.yaml`, `invalid-missing-fields.yaml`.

## Implementation order

1. Schema layer (`src/schema/*`) + schema tests.
2. Library layer (`src/lib/*`) + library tests.
3. Root `index.ts` barrel + `package.json` exports/types.
4. CLI (`src/cli/*`) + bin entry + tests.
5. MCP server (`src/mcp/*`) + bin entry + tests.
6. Update `README.md` with CLI/MCP usage examples.

## Verification

- `bun test` — all schema/lib/cli/mcp tests pass.
- `bun run typecheck` (`tsc --noEmit`) — clean under the existing strict tsconfig.
- `bun run src/cli/main.ts generate --type binary` — prints a valid YAML spec to stdout; pipe through `bun run src/cli/main.ts validate /dev/stdin` (or a temp file) to confirm round trip.
- `bun run src/cli/main.ts generate --type scalar -o /tmp/c.json -f json` then `bun run src/cli/main.ts convert /tmp/c.json --to yaml` — confirms convert path.
- Optional manual MCP check: `bunx @modelcontextprotocol/inspector bun run src/mcp/main.ts` to exercise the three tools interactively.
