import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";
import {
  ApprovedContractHandoffStore,
  ApprovedContractStore,
} from "../src/approved-contract-store.ts";

/** Stub global fetch so resolution-source URL checks never touch the network. */
let fetchSpy: ReturnType<typeof spyOn> | undefined;

type JsonSchema = {
  enum?: string[];
  items?: JsonSchema;
  minItems?: number;
  properties?: Record<string, JsonSchema>;
};

function stubFetch(fn: (url: string) => Response) {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(((
    input: unknown,
  ) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    return Promise.resolve(fn(url));
  }) as typeof fetch);
}

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
});

describe("event-contract tools", () => {
  async function connectClient(store = new ApprovedContractStore()) {
    const server = createServer(store);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.1.0" });
    await client.connect(clientTransport);
    return client;
  }

  async function submitAndApproveSelectedUnit(
    client: Client,
    contractId: string,
    unitNumber: number,
    selectedUnit: object,
  ) {
    const submitted = await client.callTool({
      name: "submit_selected_unit",
      arguments: {
        contract_id: contractId,
        unit_number: unitNumber,
        selected_unit: selectedUnit,
      },
    });
    expect(submitted.isError).toBeUndefined();
    const approved = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "selected_unit" },
    });
    expect(approved.isError).toBeUndefined();
  }

  test("all tools are listed", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("submit_drafted_questions");
    expect(names).toContain("submit_selected_unit");
    expect(names).toContain("submit_defined_terms");
    expect(names).toContain("propose_resolution_sources");
    expect(names).toContain("submit_resolution_source");
    expect(names).toContain("approve_event_contract");
    expect(names).toContain("get_approved_event_contract");
  });

  test("does not expose semantic workflow prompts", async () => {
    const client = await connectClient();
    await expect(client.listPrompts()).rejects.toThrow("Method not found");
  });

  test("tools advertise their persistence and idempotence semantics", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    for (const [name, readOnly] of [
      ["submit_drafted_questions", false],
      ["submit_selected_unit", false],
      ["submit_defined_terms", false],
      ["propose_resolution_sources", false],
      ["submit_resolution_source", false],
      ["approve_event_contract", false],
      ["get_approved_event_contract", true],
    ] as const) {
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.annotations?.readOnlyHint).toBe(readOnly);
      expect(tool.annotations?.idempotentHint).toBe(true);
    }
  });

  function expectStoredPayload(
    result: { structuredContent?: unknown },
    input: object,
  ): string {
    expect(result.structuredContent).toMatchObject(input);
    const contractId = (result.structuredContent as { contract_id?: unknown })
      .contract_id;
    expect(contractId).toEqual(expect.any(String));
    return contractId as string;
  }

  test("draft-unit tool schemas avoid unsupported oneOf and pattern constraints", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const propertiesFor = (name: string) =>
      tools.find((tool) => tool.name === name)!.inputSchema?.properties as
        | Record<string, JsonSchema>
        | undefined;
    const unitSchemas = [
      propertiesFor("submit_drafted_questions")?.units?.items,
      propertiesFor("submit_selected_unit")?.selected_unit,
      propertiesFor("submit_defined_terms")?.selected_unit,
      propertiesFor("propose_resolution_sources")?.selected_unit,
      propertiesFor("submit_resolution_source")?.selected_unit,
    ];

    for (const unitSchema of unitSchemas) {
      expect(unitSchema).not.toHaveProperty("oneOf");
      expect(unitSchema?.properties?.type?.enum).toEqual([
        "binary",
        "scalar",
        "categorical",
        "template",
      ]);
      expect(unitSchema?.properties?.question).not.toHaveProperty("pattern");
      expect(unitSchema?.properties?.variables?.items).not.toHaveProperty(
        "oneOf",
      );
    }
  });

  test("submit_drafted_questions validates and echoes a structured draft", async () => {
    const draft = {
      units: [
        {
          type: "categorical",
          questions: [
            "Will the Fed cut rates 25bps in 2026?",
            "Will the Fed cut rates 50bps in 2026?",
          ],
        },
        {
          type: "template",
          question: "Will the Fed cut rates <amount> in 2026?",
          variables: [{ name: "amount", values: ["25bps", "50bps"] }],
        },
        {
          type: "binary",
          question: "Will the Fed hold rates flat through 2026?",
        },
      ],
      followUp: "Which set should we use for further specification?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });

    expectStoredPayload(result, draft);

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.type).toBe("text");
    expect(content[0]!.text).toContain("Will the Fed cut rates 25bps in 2026?");
    expect(content[0]!.text).toContain(draft.followUp);
  });

  test("submit_drafted_questions numbers every unit sequentially with its type, including each binary separately", async () => {
    const draft = {
      units: [
        {
          type: "binary",
          question: "Will the Fed hold rates flat through 2026?",
        },
        {
          type: "categorical",
          questions: [
            "Will the Fed cut rates 25bps in 2026?",
            "Will the Fed cut rates 50bps in 2026?",
          ],
        },
        {
          type: "template",
          question: "Will the Fed cut rates <amount> in 2026?",
          variables: [{ name: "amount", values: ["25bps", "50bps"] }],
        },
        {
          type: "scalar",
          questions: [
            "Will Bitcoin close 2026 below $50k?",
            "Will Bitcoin close 2026 above $50k?",
          ],
        },
        {
          type: "template",
          question: "Will Bitcoin close 2026 <range>?",
          variables: [{ name: "range", values: ["below $50k", "above $50k"] }],
        },
        {
          type: "binary",
          question: "Will the Fed raise rates in 2026?",
        },
      ],
      followUp: "Which unit number should we use for further specification?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;

    expect(text).toContain(
      "**Unit 1: Binary market**\n- Will the Fed hold rates flat through 2026?",
    );
    expect(text).toContain(
      "**Unit 2: Categorical market**\n- Will the Fed cut rates 25bps in 2026?",
    );
    expect(text).toContain(
      "**Unit 3: Template market**\n- Will the Fed cut rates <amount> in 2026?",
    );
    expect(text).toContain(
      "**Unit 4: Scalar market**\n- Will Bitcoin close 2026 below $50k?",
    );
    expect(text).toContain(
      "**Unit 5: Template market**\n- Will Bitcoin close 2026 <range>?",
    );
    expect(text).toContain(
      "**Unit 6: Binary market**\n- Will the Fed raise rates in 2026?",
    );
    expect(text).toContain("---\n\n" + draft.followUp);
  });

  test("submit_drafted_questions renders template variables and preserves structured content", async () => {
    const draft = {
      units: [
        {
          type: "template" as const,
          question:
            "Will Bitcoin's USD price be <comparator> <price> on <date>?",
          variables: [
            { name: "comparator", values: ["below", "at least"] },
            { name: "price", values: ["$60k", "$100k"] },
            { name: "date", values: ["November 26, 2026"] },
          ],
        },
      ],
      followUp: "Should we use Unit 1 for further specification?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });

    expectStoredPayload(result, draft);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain(
      "**Unit 1: Template market**\n" +
        "- Will Bitcoin's USD price be <comparator> <price> on <date>?\n" +
        "  - `<comparator>`:\n" +
        "    - below\n" +
        "    - at least\n" +
        "  - `<price>`:\n" +
        "    - $60k\n" +
        "    - $100k\n" +
        "  - `<date>`:\n" +
        "    - November 26, 2026",
    );
    expect(content[0]!.text).toContain("---\n\n" + draft.followUp);
  });

  test("submit_drafted_questions rejects a unit missing its discriminated fields", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [{ type: "scalar" }],
        followUp: "Which one?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("submit_drafted_questions rejects a grouped market without a companion template", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [
          {
            type: "scalar",
            questions: [
              "Will Bitcoin close 2026 below $50k?",
              "Will Bitcoin close 2026 above $50k?",
            ],
          },
        ],
        followUp: "Which unit should we use?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("submit_drafted_questions still rejects a question without a trailing question mark", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [
          {
            type: "binary",
            question:
              "Will the AfD win the most seats in Germany's next federal election",
          },
        ],
        followUp: "Which unit should we use?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("submit_defined_terms advertises an output schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "submit_defined_terms")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("definitions");
    expect(tool.outputSchema?.properties).toHaveProperty("followUp");
    expect(tool.outputSchema?.properties).toHaveProperty("contract_id");
  });

  test("recall schema exposes only approved contract content", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "get_approved_event_contract")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("definitions");
    expect(tool.outputSchema?.properties).toHaveProperty(
      "proposed_resolution_sources",
    );
    expect(tool.outputSchema?.properties).toHaveProperty("resolution_sources");
    expect(tool.outputSchema?.properties).not.toHaveProperty(
      "drafted_questions",
    );
  });

  test("stores every workflow stage and recalls only approved contract content", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();
    const draft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
        {
          type: "binary" as const,
          question: "Will the ECB cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use for further specification?",
    };

    const draftResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });
    const contractId = expectStoredPayload(draftResult, draft);
    const selectedUnit = draft.units[0]!;
    const selectionResult = await client.callTool({
      name: "submit_selected_unit",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
      },
    });
    expectStoredPayload(selectionResult, {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
    });

    const pendingSelection = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pendingSelection.isError).toBe(true);

    const selectionApproval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "selected_unit" },
    });
    expect(selectionApproval.isError).toBeUndefined();
    expect(selectionApproval.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
    });

    const definitions = {
      "cut rates":
        "A reduction in the federal funds target rate announced in a single FOMC decision.",
    };
    const definitionsInput = {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
      definitions,
      followUp: "Do these definitions look right to you?",
    };
    const definitionsResult = await client.callTool({
      name: "submit_defined_terms",
      arguments: definitionsInput,
    });
    expectStoredPayload(definitionsResult, definitionsInput);

    const definitionsBeforeApproval = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(definitionsBeforeApproval.isError).toBeUndefined();
    expect(definitionsBeforeApproval.structuredContent).not.toHaveProperty(
      "definitions",
    );

    const pendingDefinitions = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pendingDefinitions.isError).toBeUndefined();
    expect(pendingDefinitions.structuredContent).not.toHaveProperty(
      "definitions",
    );

    const definitionsApproval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });
    expect(definitionsApproval.isError).toBeUndefined();

    const proposalInput = {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
      sources: [
        {
          rank: 1,
          name: "Federal Reserve decisions",
          publisher: "Federal Reserve Board",
          url: "https://fed.example/decisions",
        },
        {
          rank: 2,
          name: "Rate decision archive",
          publisher: "Independent Rates Institute",
          url: "https://rates.example/archive",
        },
      ],
      followUp: "Does this source hierarchy look right?",
    };
    const proposalResult = await client.callTool({
      name: "propose_resolution_sources",
      arguments: proposalInput,
    });
    expectStoredPayload(proposalResult, proposalInput);

    const pendingProposal = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pendingProposal.isError).toBeUndefined();
    expect(pendingProposal.structuredContent).not.toHaveProperty(
      "proposed_resolution_sources",
    );

    const proposalApproval = await client.callTool({
      name: "approve_event_contract",
      arguments: {
        contract_id: contractId,
        stage: "proposed_resolution_sources",
      },
    });
    expect(proposalApproval.isError).toBeUndefined();

    const resolutionInput = {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
      sources: [
        {
          id: "federal-reserve-decisions",
          rank: 1,
          controlsFor: ["rate decision"],
          name: "Federal Reserve decisions",
          publisher: "Federal Reserve Board",
          url: "https://fed.example/decisions",
          publicationSchedule: "Published after each scheduled policy meeting.",
          publiclyAccessible: true,
          independenceNote:
            "The public agency publishes decisions independently of market participants.",
        },
        {
          id: "rate-decision-archive",
          rank: 2,
          controlsFor: ["rate decision"],
          name: "Rate decision archive",
          publisher: "Independent Rates Institute",
          url: "https://rates.example/archive",
          publicationSchedule: "Updated after each scheduled policy meeting.",
          publiclyAccessible: true,
          independenceNote:
            "The independent institute publishes its archive without market control.",
        },
      ],
      followUp: "Are these detailed sources correct?",
    };
    const resolutionResult = await client.callTool({
      name: "submit_resolution_source",
      arguments: resolutionInput,
    });
    expectStoredPayload(resolutionResult, resolutionInput);

    const pendingResolution = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pendingResolution.isError).toBeUndefined();
    expect(pendingResolution.structuredContent).not.toHaveProperty(
      "resolution_sources",
    );

    const resolutionApproval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "resolution_sources" },
    });
    expect(resolutionApproval.isError).toBeUndefined();

    const retrieved = await client.callTool({
      name: "get_approved_event_contract",
      arguments: {},
    });
    expect(retrieved.isError).toBeUndefined();
    expect(retrieved.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: definitionsInput.unit_number,
      selected_unit: definitionsInput.selected_unit,
      definitions: definitionsInput.definitions,
      proposed_resolution_sources: {
        sources: proposalInput.sources,
      },
      resolution_sources: {
        sources: resolutionInput.sources,
      },
    });
    const structured = retrieved.structuredContent as Record<string, unknown>;
    expect(structured["drafted_questions"]).toBeUndefined();
    expect(structured["defined_terms"]).toBeUndefined();
    expect(structured["followUp"]).toBeUndefined();
    const content = retrieved.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("### Selected Unit");
    expect(content[0]!.text).toContain("### Approved Definitions");
    expect(content[0]!.text).not.toContain("### Drafted Questions");
    expect(content[0]!.text).not.toContain("### Defined Terms");
    expect(content[0]!.text).toContain("### Proposed Resolution Sources");
    expect(content[0]!.text).toContain("### Detailed Resolution Sources");
    expect(content[0]!.text).toContain("**cut rates**");
    expect(content[0]!.text).toContain("Federal Reserve decisions");
    expect(content[0]!.text).not.toContain("Will the ECB cut rates in 2026?");
    expect(content[0]!.text).not.toContain(definitionsInput.followUp);
    expect(content[0]!.text).not.toContain(proposalInput.followUp);
    expect(content[0]!.text).not.toContain(resolutionInput.followUp);
    expect(content[0]!.text.match(/\*\*Selected Unit 1:/g)).toHaveLength(1);
  });

  test("requires explicit selected-unit approval before definitions approval", async () => {
    const client = await connectClient();
    const selectedUnit = {
      type: "binary" as const,
      question: "Will the Fed cut rates in 2026?",
    };
    const draftResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [selectedUnit],
        followUp: "Which unit should we use?",
      },
    });
    const contractId = expectStoredPayload(draftResult, {
      units: [selectedUnit],
      followUp: "Which unit should we use?",
    });

    await client.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
        definitions: { "cut rates": "A reduction in the target rate." },
        followUp: "Do these definitions look right?",
      },
    });
    const approval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });
    expect(approval.isError).toBe(true);
    expect(
      (approval.content as Array<{ type: string; text: string }>)[0]!.text,
    ).toContain("selected_unit must be approved first");
  });

  test("retries replace a stage and clear downstream snapshots", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();
    const draft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const draftResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });
    const contractId = expectStoredPayload(draftResult, draft);
    await submitAndApproveSelectedUnit(client, contractId, 1, draft.units[0]!);
    const baseDefinitions = {
      "cut rates": "A reduction in the target rate at one policy meeting.",
    };
    await client.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: draft.units[0],
        definitions: baseDefinitions,
        followUp: "Do these definitions look right?",
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });
    await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: draft.units[0],
        sources: [
          {
            rank: 1,
            name: "Federal Reserve decisions",
            publisher: "Federal Reserve Board",
            url: "https://fed.example/decisions",
          },
        ],
        followUp: "Does this source hierarchy look right?",
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: {
        contract_id: contractId,
        stage: "proposed_resolution_sources",
      },
    });

    const revisedDefinitions = {
      "cut rates":
        "A reduction of at least 25 basis points in the federal funds target range at one policy meeting.",
    };
    const retry = await client.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: draft.units[0],
        definitions: revisedDefinitions,
        followUp: "Do these revised definitions look right?",
      },
    });
    expectStoredPayload(retry, {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: draft.units[0],
      definitions: revisedDefinitions,
      followUp: "Do these revised definitions look right?",
    });

    const pendingRetrieved = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pendingRetrieved.isError).toBeUndefined();
    expect(pendingRetrieved.structuredContent).not.toHaveProperty(
      "definitions",
    );

    await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });
    const retrieved = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(retrieved.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: 1,
      selected_unit: draft.units[0],
      definitions: revisedDefinitions,
    });
    const record = retrieved.structuredContent as Record<string, unknown>;
    expect(record["drafted_questions"]).toBeUndefined();
    expect(record["defined_terms"]).toBeUndefined();
    expect(record["proposed_resolution_sources"]).toBeUndefined();
    expect(record["resolution_sources"]).toBeUndefined();
  });

  test("isolates approved contract memory between server sessions", async () => {
    const firstClient = await connectClient();
    const secondClient = await connectClient();
    const draft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const saved = await firstClient.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });
    const contractId = expectStoredPayload(saved, draft);
    await submitAndApproveSelectedUnit(
      firstClient,
      contractId,
      1,
      draft.units[0]!,
    );
    await firstClient.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: draft.units[0],
        definitions: {
          "cut rates": "A reduction in the target rate.",
        },
        followUp: "Do these definitions look right?",
      },
    });
    await firstClient.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });

    const leaked = await secondClient.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(leaked.isError).toBe(true);
    expect(
      (leaked.content as Array<{ type: string; text: string }>)[0]!.text,
    ).toContain("No approved event contract was found");

    const available = await firstClient.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(available.isError).toBeUndefined();
    expect(available.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: 1,
      selected_unit: draft.units[0],
      definitions: {
        "cut rates": "A reduction in the target rate.",
      },
    });
  });

  test("hands off an approved contract across sessions only with explicit contract_id", async () => {
    const handoffStore = new ApprovedContractHandoffStore();
    const firstClient = await connectClient(
      new ApprovedContractStore(handoffStore),
    );
    const secondClient = await connectClient(
      new ApprovedContractStore(handoffStore),
    );
    const thirdClient = await connectClient(
      new ApprovedContractStore(handoffStore),
    );
    const draft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
        {
          type: "binary" as const,
          question: "Will the ECB cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };

    const draftResult = await firstClient.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });
    const contractId = expectStoredPayload(draftResult, draft);

    await submitAndApproveSelectedUnit(
      secondClient,
      contractId,
      2,
      draft.units[1]!,
    );

    const definitionsResult = await secondClient.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: contractId,
        unit_number: 2,
        selected_unit: draft.units[1],
        definitions: {
          "cut rates": "A reduction in the ECB deposit facility rate.",
        },
        followUp: "Do these definitions look right?",
      },
    });
    expect(definitionsResult.isError).toBeUndefined();
    expect(definitionsResult.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: 2,
    });

    const approvalResult = await secondClient.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "defined_terms" },
    });
    expect(approvalResult.isError).toBeUndefined();

    const recalled = await thirdClient.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(recalled.isError).toBeUndefined();
    expect(recalled.structuredContent).toMatchObject({
      contract_id: contractId,
      unit_number: 2,
      selected_unit: draft.units[1],
      definitions: {
        "cut rates": "A reduction in the ECB deposit facility rate.",
      },
    });

    const implicitLookup = await thirdClient.callTool({
      name: "get_approved_event_contract",
      arguments: {},
    });
    expect(implicitLookup.isError).toBe(true);
    expect(
      (implicitLookup.content as Array<{ type: string; text: string }>)[0]!
        .text,
    ).toContain(
      "No approved event-contract information is available in this chat.",
    );
  });

  test("keeps multiple contracts distinct and defaults retrieval to the latest", async () => {
    const client = await connectClient();
    const firstDraft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const secondDraft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the ECB cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const firstResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: firstDraft,
    });
    const firstId = expectStoredPayload(firstResult, firstDraft);
    const secondResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: secondDraft,
    });
    const secondId = expectStoredPayload(secondResult, secondDraft);
    expect(secondId).not.toBe(firstId);

    await submitAndApproveSelectedUnit(
      client,
      firstId,
      1,
      firstDraft.units[0]!,
    );
    await submitAndApproveSelectedUnit(
      client,
      secondId,
      1,
      secondDraft.units[0]!,
    );

    await client.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: firstId,
        unit_number: 1,
        selected_unit: firstDraft.units[0],
        definitions: { "Fed cut": "A reduction in the target rate." },
        followUp: "Do these definitions look right?",
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: firstId, stage: "defined_terms" },
    });
    await client.callTool({
      name: "submit_defined_terms",
      arguments: {
        contract_id: secondId,
        unit_number: 1,
        selected_unit: secondDraft.units[0],
        definitions: { "ECB cut": "A reduction in the target rate." },
        followUp: "Do these definitions look right?",
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: secondId, stage: "defined_terms" },
    });

    const first = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: firstId },
    });
    expect(first.structuredContent).toMatchObject({
      contract_id: firstId,
      selected_unit: firstDraft.units[0],
      definitions: { "Fed cut": "A reduction in the target rate." },
    });

    const thirdDraft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the BoJ raise rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const thirdResult = await client.callTool({
      name: "submit_drafted_questions",
      arguments: thirdDraft,
    });
    expectStoredPayload(thirdResult, thirdDraft);

    const latest = await client.callTool({
      name: "get_approved_event_contract",
      arguments: {},
    });
    expect(latest.structuredContent).toMatchObject({
      contract_id: secondId,
      selected_unit: secondDraft.units[0],
      definitions: { "ECB cut": "A reduction in the target rate." },
    });
  });

  test("does not recall unselected draft candidates", async () => {
    const client = await connectClient();
    const draft = {
      units: [
        {
          type: "binary" as const,
          question: "Will the Fed cut rates in 2026?",
        },
      ],
      followUp: "Which unit should we use?",
    };
    const saved = await client.callTool({
      name: "submit_drafted_questions",
      arguments: draft,
    });
    const contractId = expectStoredPayload(saved, draft);

    const retrieved = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(retrieved.isError).toBe(true);
    expect(
      (retrieved.content as Array<{ type: string; text: string }>)[0]!.text,
    ).toContain("No approved event contract was found");
  });

  test("submit_defined_terms shows numbered selected unit, em-dash definitions, and follow-up", async () => {
    const input = {
      unit_number: 3,
      selected_unit: {
        type: "binary" as const,
        question: "Will the Fed cut rates 50+ bps by end of 2026?",
      },
      definitions: {
        "50+ bps":
          "A rate cut of 50 basis points or more in a single FOMC decision.",
        "end of 2026":
          "Market close on December 31, 2026, or the last trading day of 2026 if Dec 31 falls on a weekend or holiday.",
      },
      followUp:
        "Do these definitions look right to you, or would you like to adjust any of them?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_defined_terms",
      arguments: input,
    });

    expectStoredPayload(result, input);

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.type).toBe("text");
    const text = content[0]!.text;
    expect(text).toContain(
      "**Selected Unit 3: Binary market**\n- Will the Fed cut rates 50+ bps by end of 2026?",
    );
    expect(text).toContain(
      "Will the Fed cut rates 50+ bps by end of 2026?\n\n---\n\n### Definitions\n\n- **50+ bps** —",
    );
    expect(text).toContain("**50+ bps** —");
    expect(text).toContain("**end of 2026** —");
    expect(text).toContain("---\n\n" + input.followUp);
  });

  test("submit_defined_terms renders scalar unit with all questions as bullets", async () => {
    const input = {
      unit_number: 2,
      selected_unit: {
        type: "scalar" as const,
        questions: [
          "Will the Fed cut rates 25bps in 2026?",
          "Will the Fed cut rates 50bps in 2026?",
        ],
      },
      definitions: {
        "cut rates 25bps":
          "A reduction of exactly 25 basis points to the federal funds target rate at a single FOMC meeting.",
      },
      followUp: "Do these definitions match your expectations?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_defined_terms",
      arguments: input,
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "**Selected Unit 2: Scalar market**\n- Will the Fed cut rates 25bps in 2026?",
    );
    expect(text).toContain("- Will the Fed cut rates 50bps in 2026?");
  });

  test("submit_defined_terms renders the complete selected template unit", async () => {
    const input = {
      unit_number: 6,
      selected_unit: {
        type: "template" as const,
        question:
          "Will the museum's dinosaur exhibition remain open through <date>?",
        variables: [
          {
            name: "date",
            values: ["August 25", "August 31", "September 15"],
          },
        ],
      },
      definitions: {
        "dinosaur exhibition":
          "The ticketed dinosaur exhibition advertised by the museum under that title.",
      },
      followUp: "Do these definitions match your expectations?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_defined_terms",
      arguments: input,
    });

    expectStoredPayload(result, input);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain(
      "**Selected Unit 6: Template market**\n" +
        "- Will the museum's dinosaur exhibition remain open through <date>?\n" +
        "  - `<date>`:\n" +
        "    - August 25\n" +
        "    - August 31\n" +
        "    - September 15",
    );
  });

  test("submit_defined_terms accepts a selected alternative display-question handoff", async () => {
    const input = {
      unit_number: 2,
      selected_unit: {
        type: "binary" as const,
        question: "Will the national metric reach the threshold by June 2026?",
      },
      definitions: {
        "national metric":
          "The nationally reported measure published by the named reporting agency.",
      },
      followUp: "Do these definitions fit the alternative market?",
    };
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_defined_terms",
      arguments: input,
    });

    expectStoredPayload(result, input);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain(
      "**Selected Unit 2: Binary market**\n" +
        "- Will the national metric reach the threshold by June 2026?",
    );
    expect(content[0]!.text).toContain(
      "Do these definitions fit the alternative market?",
    );
  });

  test("propose_resolution_sources advertises an output schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "propose_resolution_sources")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("sources");
    expect(tool.outputSchema?.properties).toHaveProperty("coverage_gaps");
    expect(tool.outputSchema?.properties).toHaveProperty("alternative_market");
    expect(tool.outputSchema?.properties).toHaveProperty("followUp");
    const alternativeSchema = tool.outputSchema?.properties
      ?.alternative_market as JsonSchema | undefined;
    expect(alternativeSchema?.properties).toHaveProperty(
      "display_question_unit",
    );
    expect(alternativeSchema?.properties).not.toHaveProperty("selected_unit");
    const sourcesSchema = tool.outputSchema?.properties?.sources as
      | JsonSchema
      | undefined;
    expect(sourcesSchema?.items?.properties).toHaveProperty("url");
    expect(
      (sourcesSchema?.items?.properties?.url as JsonSchema | undefined)
        ?.description,
    ).toContain("Source locator URL");
    expect(sourcesSchema?.minItems).toBe(1);
  });

  test("propose_resolution_sources renders clickable source URLs in rank order and echoes structured content", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          rank: 2,
          name: "FRED CPI series",
          publisher: "Federal Reserve Bank of St. Louis",
          url: "https://fred.stlouisfed.org/series/CPIAUCNS",
        },
        {
          rank: 1,
          name: "BLS Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://www.bls.gov/cpi/",
        },
      ],
      followUp:
        "Does this source hierarchy look right, or should we add, remove, or reorder any source?",
    };
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: input,
    });

    expectStoredPayload(result, input);

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "**Selected Unit 1: Binary market**\n- Will U.S. CPI rise 3%+ year-over-year in June 2026?",
    );
    expect(text).toContain(
      "---\n\n### Resolution Source Hierarchy\n\n" +
        "**1. BLS Consumer Price Index** (U.S. Bureau of Labor Statistics)\n" +
        "- URL: [https://www.bls.gov/cpi/](https://www.bls.gov/cpi/)",
    );
    // Rank 1 renders before rank 2 regardless of input order.
    const primaryIdx = text.indexOf("**1. BLS Consumer Price Index**");
    const fallbackIdx = text.indexOf("**2. FRED CPI series**");
    expect(primaryIdx).toBeGreaterThanOrEqual(0);
    expect(fallbackIdx).toBeGreaterThan(primaryIdx);
    expect(text).toContain(
      "- URL: [https://fred.stlouisfed.org/series/CPIAUCNS]" +
        "(https://fred.stlouisfed.org/series/CPIAUCNS)",
    );
    // Full per-source detail still does not leak into the concise proposal.
    expect(text).not.toContain("- Establishes:");
    expect(text).toContain("---\n\n" + input.followUp);
  });

  test("propose_resolution_sources silently keeps only links verified with HTTP 200", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          rank: 1,
          name: "BLS Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://www.bls.gov/cpi/",
        },
        {
          rank: 2,
          name: "Stale CPI mirror",
          publisher: "Independent Data Archive",
          url: "https://archive.example/cpi",
        },
      ],
      followUp: "Does this source hierarchy look right?",
    };
    stubFetch((url) =>
      url.includes("archive.example")
        ? new Response(null, { status: 204 })
        : new Response(null, { status: 200 }),
    );
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: input,
    });

    expect(result.isError).toBeUndefined();
    expect(
      (result.structuredContent as { sources: unknown[] }).sources,
    ).toEqual([input.sources[0]]);
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "- URL: [https://www.bls.gov/cpi/](https://www.bls.gov/cpi/)",
    );
    expect(text).not.toContain("archive.example");
    expect(text).not.toContain("Link check");
    expect(text).not.toContain("204");
  });

  test("propose_resolution_sources returns no proposal when no URL returns HTTP 200", async () => {
    stubFetch(
      () => new Response(null, { status: 404, statusText: "Not Found" }),
    );
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [
          {
            rank: 1,
            name: "Unavailable CPI source",
            publisher: "Unavailable Statistics Agency",
            url: "https://unavailable.example/cpi",
          },
        ],
        followUp: "Which source should be used?",
      },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toBe(
      "No resolution-source proposal is available.",
    );
    expect(content[0]!.text).not.toContain("404");
    expect(content[0]!.text).not.toContain("unavailable.example");
    expect(result.structuredContent).toBeUndefined();
  });

  test("propose_resolution_sources omits an alternative with fewer than two verified links", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will the metric reach the threshold by June 2026?",
      },
      sources: [
        {
          rank: 1,
          name: "Primary metric report",
          publisher: "Primary Statistics Agency",
          url: "https://primary.example/metric",
        },
        {
          rank: 2,
          name: "Independent metric report",
          publisher: "Independent Statistics Agency",
          url: "https://independent.example/metric",
        },
      ],
      coverage_gaps: ["the regional breakdown"],
      alternative_market: {
        unit_number: 2,
        display_question_unit: {
          type: "binary" as const,
          question:
            "Will the national metric reach the threshold by June 2026?",
        },
        rationale:
          "The national version stays close to the user's intent and is published independently by two agencies.",
        sources: [
          {
            name: "National agency series",
            publisher: "National Statistics Agency",
            url: "https://national.example/metric",
          },
          {
            name: "Unavailable research series",
            publisher: "Independent Research Institute",
            url: "https://research.example/unavailable",
          },
        ],
      },
      followUp: "Would you prefer the nearby alternative market?",
    };
    stubFetch((url) =>
      url.includes("unavailable")
        ? new Response(null, { status: 404 })
        : new Response(null, { status: 200 }),
    );
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: input,
    });

    expect(result.isError).toBeUndefined();
    expect(
      (result.structuredContent as { alternative_market?: unknown })
        .alternative_market,
    ).toBeUndefined();
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain("⚠ No authoritative primary source was found for:");
    expect(text).not.toContain("Nearby Alternative Display Question");
    expect(text).not.toContain("research.example/unavailable");
  });

  test("propose_resolution_sources rejects an empty source list", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [],
        followUp: "Which source?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("propose_resolution_sources requires a valid source URL", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [
          {
            rank: 1,
            name: "BLS Consumer Price Index",
            publisher: "U.S. Bureau of Labor Statistics",
            url: "not-a-url",
          },
          {
            rank: 2,
            name: "FRED CPI series",
            publisher: "Federal Reserve Bank of St. Louis",
            url: "https://fred.stlouisfed.org/series/CPIAUCNS",
          },
        ],
        followUp: "Does this source hierarchy look right?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("propose_resolution_sources allows a primary-only hierarchy with a warning", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [
          {
            rank: 1,
            name: "BLS Consumer Price Index",
            publisher: "U.S. Bureau of Labor Statistics",
            url: "https://www.bls.gov/cpi/",
          },
        ],
        followUp: "Which source?",
      },
    });

    expect(result.isError).toBeUndefined();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain(
      "⚠ Warning: Only one resolution source is supplied.",
    );
    expect(content[0]!.text).toContain(
      "the market will have no pre-approved fallback resolution source.",
    );
    expect(content[0]!.text).toContain(
      "No independent fallback source was found or approved for this market.",
    );
    expect(content[0]!.text).toContain(
      "Alternative: consider a nearby proxy or revised market question",
    );
  });

  test("propose_resolution_sources rejects repeated publishers as non-independent", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will the metric reach the threshold by June 2026?",
        },
        sources: [
          {
            rank: 1,
            name: "Agency Alpha official series",
            publisher: "Agency Alpha",
            url: "https://alpha.example/series",
          },
          {
            rank: 2,
            name: "Agency Alpha mirror",
            publisher: " agency alpha ",
            url: "https://alpha.example/mirror",
          },
        ],
        followUp: "Does this source hierarchy look right?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("propose_resolution_sources renders source coverage gaps and a two-source alternative", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will the metric reach the threshold by June 2026?",
      },
      sources: [
        {
          rank: 1,
          name: "Primary metric report",
          publisher: "Primary Statistics Agency",
          url: "https://primary.example/metric",
        },
      ],
      coverage_gaps: ["the regional breakdown"],
      alternative_market: {
        unit_number: 2,
        display_question_unit: {
          type: "binary" as const,
          question:
            "Will the national metric reach the threshold by June 2026?",
        },
        rationale:
          "The national version stays close to the user's intent and is published independently by two agencies.",
        sources: [
          {
            name: "National agency series",
            publisher: "National Statistics Agency",
            url: "https://national.example/metric",
          },
          {
            name: "Independent research series",
            publisher: "Independent Research Institute",
            url: "https://research.example/metric",
          },
        ],
      },
      followUp:
        "The regional breakdown lacks a primary source. Would you prefer the nearby alternative market?",
    };
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: input,
    });

    expect(result.isError).toBeUndefined();
    expectStoredPayload(result, input);
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "⚠ No authoritative primary source was found for: the regional breakdown.",
    );
    expect(text).toContain(
      "Alternative required: propose a nearby or proxy market with at least two independent resolution sources",
    );
    expect(text).toContain("### Nearby Alternative Display Question");
    expect(text).not.toContain("### Definitions");
    expect(text).toContain(
      "**Alternative Unit 2: Binary market**\n" +
        "- Will the national metric reach the threshold by June 2026?",
    );
    expect(text).toContain(
      "- If selected: treat this display-question proposal as Unit 2, then continue with define-terms from scratch; re-check these source candidates after the new definitions are agreed.",
    );
    expect(text).toContain(
      "- Independent resolution sources:\n" +
        "  - **National agency series** (National Statistics Agency)",
    );
  });

  test("propose_resolution_sources requires contiguous primary and fallback ranks", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "propose_resolution_sources",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [
          {
            rank: 1,
            name: "BLS Consumer Price Index",
            publisher: "U.S. Bureau of Labor Statistics",
            url: "https://www.bls.gov/cpi/",
          },
          {
            rank: 3,
            name: "FRED CPI series",
            publisher: "Federal Reserve Bank of St. Louis",
            url: "https://fred.stlouisfed.org/series/CPIAUCNS",
          },
        ],
        followUp: "Which source?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("submit_resolution_source advertises an output schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "submit_resolution_source")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("sources");
    expect(tool.outputSchema?.properties).toHaveProperty("coverage_gaps");
    expect(tool.outputSchema?.properties).toHaveProperty("alternative_market");
    expect(tool.outputSchema?.properties).toHaveProperty("followUp");
    const alternativeSchema = tool.outputSchema?.properties
      ?.alternative_market as JsonSchema | undefined;
    expect(alternativeSchema?.properties).toHaveProperty(
      "display_question_unit",
    );
    expect(alternativeSchema?.properties).not.toHaveProperty("selected_unit");
    const sourcesSchema = tool.outputSchema?.properties?.sources as
      | JsonSchema
      | undefined;
    expect(sourcesSchema?.minItems).toBe(1);
  });

  test("submit_resolution_source renders sources in rank order and echoes structured content", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          id: "bls-cpi-backup",
          rank: 2,
          controlsFor: ["headline CPI value"],
          name: "FRED CPI series",
          publisher: "Federal Reserve Bank of St. Louis",
          url: "https://fred.stlouisfed.org/series/CPIAUCNS",
          publicationSchedule: "Monthly, mirrors the BLS release schedule.",
          publiclyAccessible: true,
          independenceNote:
            "A public reserve bank data mirror with no stake in any market outcome.",
        },
        {
          id: "bls-cpi",
          rank: 1,
          controlsFor: ["headline CPI value", "year-over-year change"],
          name: "BLS Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://www.bls.gov/cpi/",
          datasetId: "CUUR0000SA0",
          publicationSchedule:
            "Monthly, around the middle of the following month.",
          publiclyAccessible: true,
          independenceNote:
            "A federal statistical agency independent of any prediction market participant.",
        },
      ],
      followUp:
        "Does this source hierarchy look right, or should we adjust it?",
    };
    stubFetch(() => new Response(null, { status: 200 }));

    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: input,
    });

    expectStoredPayload(result, input);

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "**Selected Unit 1: Binary market**\n- Will U.S. CPI rise 3%+ year-over-year in June 2026?",
    );
    expect(text).toContain(
      "---\n\n### Resolution Source Hierarchy\n\n**1. BLS Consumer Price Index**",
    );
    // Rank 1 must render before rank 2 regardless of input order.
    const primaryIdx = text.indexOf("**1. BLS Consumer Price Index**");
    const fallbackIdx = text.indexOf("**2. FRED CPI series**");
    expect(primaryIdx).toBeGreaterThanOrEqual(0);
    expect(fallbackIdx).toBeGreaterThan(primaryIdx);
    expect(text).toContain("(dataset CUUR0000SA0)");
    expect(text).toContain(
      "- Publishing Schedule: Monthly, around the middle of the following month.",
    );
    expect(text).not.toContain("- Published:");
    expect(text).not.toContain("- Link check:");
    expect(text).not.toContain("- Publicly accessible:");
    expect(text).not.toContain("One or more resolution sources");
    expect(text).toContain("---\n\n" + input.followUp);
  });

  test("submit_resolution_source checks URLs without exposing check status or access metadata", async () => {
    const url = "https://unavailable.example/cpi";
    const checkedUrls: string[] = [];
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          id: "unavailable-cpi",
          rank: 1,
          controlsFor: ["headline CPI value"],
          name: "Unavailable CPI source",
          publisher: "Statistics Agency",
          url,
          publicationSchedule: "Monthly publication.",
          publiclyAccessible: false,
          independenceNote: "The agency publishes the official value.",
        },
      ],
      followUp: "Does this source hierarchy look right?",
    };
    stubFetch((checkedUrl) => {
      checkedUrls.push(checkedUrl);
      return new Response(null, { status: 404, statusText: "Not Found" });
    });
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: input,
    });

    expect(result.isError).toBeUndefined();
    expect(checkedUrls).toEqual([url]);
    expectStoredPayload(result, input);
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "⚠ One or more resolution sources are not publicly accessible or could not be automatically verified",
    );
    expect(text).not.toContain("404");
    expect(text).not.toContain("Link check");
    expect(text).not.toContain("Publicly accessible");
    expect(text).not.toContain("publiclyAccessible");
  });

  test("submit_resolution_source allows a primary-only hierarchy with a warning", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [
          {
            id: "bls-cpi",
            rank: 1,
            controlsFor: ["headline CPI value"],
            name: "BLS Consumer Price Index",
            publisher: "U.S. Bureau of Labor Statistics",
            url: "https://www.bls.gov/cpi/",
            publicationSchedule:
              "Monthly, around the middle of the following month.",
            publiclyAccessible: true,
            independenceNote:
              "A federal statistical agency independent of any prediction market participant.",
          },
        ],
        followUp: "Which source?",
      },
    });

    expect(result.isError).toBeUndefined();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain(
      "⚠ Warning: Only one resolution source is supplied.",
    );
    expect(content[0]!.text).toContain(
      "the market will have no pre-approved fallback resolution source.",
    );
    expect(content[0]!.text).toContain(
      "No independent fallback source was found or approved for this market.",
    );
    expect(content[0]!.text).toContain(
      "Alternative: consider a nearby proxy or revised market question",
    );
  });

  test("submit_resolution_source rejects a repeated source URL even across publishers", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will the metric reach the threshold by June 2026?",
        },
        sources: [
          {
            id: "primary-metric",
            rank: 1,
            controlsFor: ["the metric"],
            name: "Primary metric report",
            publisher: "Primary Statistics Agency",
            url: "https://example.test/metric",
            publicationSchedule: "Monthly publication on a fixed schedule.",
            publiclyAccessible: true,
            independenceNote:
              "The agency publishes the value independently of all market participants.",
          },
          {
            id: "secondary-metric",
            rank: 2,
            controlsFor: ["the metric"],
            name: "Secondary metric report",
            publisher: "Independent Research Institute",
            url: "https://example.test/metric",
            publicationSchedule: "Monthly publication on a fixed schedule.",
            publiclyAccessible: true,
            independenceNote:
              "The institute publishes its own independent estimate without market influence.",
          },
        ],
        followUp: "Does this source hierarchy look right?",
      },
    });

    expect(result.isError).toBe(true);
  });

  test("submit_resolution_source renders coverage gaps and an alternative market", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will the metric reach the threshold by June 2026?",
      },
      sources: [
        {
          id: "primary-metric",
          rank: 1,
          controlsFor: ["the metric"],
          name: "Primary metric report",
          publisher: "Primary Statistics Agency",
          url: "https://primary.example/metric",
          publicationSchedule: "Monthly publication on a fixed schedule.",
          publiclyAccessible: true,
          independenceNote:
            "The agency publishes the value independently of all market participants.",
        },
      ],
      coverage_gaps: ["the regional breakdown"],
      alternative_market: {
        unit_number: 2,
        display_question_unit: {
          type: "binary" as const,
          question:
            "Will the national metric reach the threshold by June 2026?",
        },
        rationale:
          "The national version stays close to the user's intent and is published independently by two agencies.",
        sources: [
          {
            name: "National agency series",
            publisher: "National Statistics Agency",
            url: "https://national.example/metric",
          },
          {
            name: "Independent research series",
            publisher: "Independent Research Institute",
            url: "https://research.example/metric",
          },
        ],
      },
      followUp:
        "The regional breakdown lacks a primary source. Would you prefer the nearby alternative market?",
    };
    stubFetch(() => new Response(null, { status: 200 }));
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: input,
    });

    expect(result.isError).toBeUndefined();
    expectStoredPayload(result, input);
    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain(
      "⚠ No authoritative primary source was found for: the regional breakdown.",
    );
    expect(text).toContain(
      "Alternative required: propose a nearby or proxy market with at least two independent resolution sources",
    );
    expect(text).toContain("### Nearby Alternative Display Question");
    expect(text).not.toContain("### Definitions");
    expect(text).toContain(
      "[https://research.example/metric](https://research.example/metric)",
    );
    expect(text).toContain(
      "If selected: treat this display-question proposal as Unit 2, then continue with define-terms from scratch",
    );
  });

  test("submit_resolution_source rejects an empty source list", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        sources: [],
        followUp: "Which source?",
      },
    });

    expect(result.isError).toBe(true);
  });
});
