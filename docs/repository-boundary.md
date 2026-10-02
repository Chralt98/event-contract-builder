# Project ownership and contribution boundary

Event Contract Builder is the open-source umbrella and npm package. Its
Foresight package exports the schemas, types, tool descriptors, and
client-visible instructions used by the `bleavit-foresight` plugin. The
plugin's display name is Bleavit Foresight.

| Open-source repository                                                                                            | Hosted service and private operations                                |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `event-contract-builder`: Foresight schemas, types, validation, tool descriptors, and client-visible instructions | HTTP and stdio MCP execution                                         |
| Seven plugin skills and their references                                                                          | Workflow state, rendering, and approval handling                     |
| Plugin packaging and local development refresh                                                                    | Backend integration tests and deployment tooling                     |
| Public interface and structural validation                                                                        | Future data ingestion, probability monitoring, accounts, and billing |

The hosted service consumes the public package. Public schemas describe the
client-visible interface; the repository does not contain tool handlers, a
workflow state store, or service deployment code. Structural validation does
not establish that sources are independent or that a forecast is legally
compliant; the plugin's workflow instructions and review process address those
questions separately.

Approved forecast specifications are retrieved through the public
`get_approved_forecast_specification` tool. The client-visible Markdown
instructions define the review format; rendering and deployment
implementations remain private.

The public source and npm package use Apache-2.0. Hosted-service code retains
the license and attribution of inherited public material. Narrowing the
current package does not rewrite previously published Git history.
