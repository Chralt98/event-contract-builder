# Project ownership and contribution boundary

Event Contract Builder is the open-source umbrella and npm package. Its first
plugin product is identified as `bleavit-foresight` and displayed as Bleavit
Foresight; it currently creates forecast specifications. Probability
monitoring is planned; there are no monitoring jobs or probability estimates yet.

| Open-source project                                                                  | Hosted service and private operations                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Full event-contract library and CNL utilities                                        | HTTP and stdio servers                                                            |
| Four skills and references                                                           | Tool handlers and rendering                                                       |
| Plugin packaging and development refresh                                             | Approval workflow, session state and internal records                             |
| `event-contract-builder/foresight`: schemas, types, descriptors, server instructions | Backend integration tests and deployment tooling                                  |
| Structural validation and interface tests                                            | Future data ingestion, monitoring, probability calculations, accounts and billing |

The hosted service imports the public package. Public builds and tests are
independent of hosted-service code. Client-visible schemas and instructions
belong in the public interface even when their consumers run privately. Internal
workflow records and business logic do not belong in that export. Source rank and
duplicate checks are structural refinements; they do not prove that two publishers
produce independent evidence. The skills assess that separately.

Existing full event-contract exports remain supported. Forecast sources use a
separate smaller schema, leaving the general library's richer resolution schema
unchanged. The forecast MCP interface intentionally breaks with the earlier
event-contract tool names; refresh connections and start new sessions. Its
identifier is `forecast_specification_id`; no compatibility aliases are provided.

The public source and package use Apache-2.0. Hosted-service code retains the
license and attribution of inherited public material. Moving implementation out
of the public working tree does not erase previously published Git history.
Private development protects subsequent implementation changes, not old copies.

## September 2026 migration

The forecast-focused changes were ported by behavior, without merging a separate
operational implementation into the public repository:

| Commit                                | Result                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `2e8726f` remove define timing        | Four skills; selection proceeds directly to definitions. Full-library timing remains.   |
| `ffca421` add refresh plugin          | Portable refresh command with marketplace source verification.                          |
| `2733ec9` simplify resolution sources | Forecast source records contain identity, rank, publisher, URL and optional dataset ID. |
| `ceb91ca` forecast terminology        | Forecast tool names, fields and workflow text; the umbrella package identity remains.   |
| `ef1083c` fallback source hint        | Continue with one source, change the question, or supply a fallback for evaluation.     |

The Bleavit Foresight display-name correction is retained.
Neither publishing nor Git history rewriting is part of the migration.
