import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";
import {
  ApprovedContractHandoffStore,
  ApprovedContractStore,
} from "../src/approved-contract-store.ts";

type JsonSchema = {
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  minItems?: number;
  properties?: Record<string, JsonSchema>;
};

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
    await submitAndApproveTiming(client, contractId, unitNumber, selectedUnit);
  }

  async function submitAndApproveTiming(
    client: Client,
    contractId: string,
    unitNumber: number,
    selectedUnit: object,
  ) {
    const timing = {
      contract_id: contractId,
      unit_number: unitNumber,
      selected_unit: selectedUnit,
      timing_type: "point_in_time" as const,
      event_deadline: "2026-12-31T23:59:59Z",
      boundary: { end: "inclusive" as const },
      time_zone: "UTC",
      evidence_rule: "occurrence" as const,
      trading: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-12-30T23:59:59Z",
        time_zone: "UTC",
      },
      expiration: {
        datetime: "2027-01-02T00:00:00Z",
        time_zone: "UTC",
      },
      followUp: "Do you approve this complete timing proposal?",
    };
    const submission = await client.callTool({
      name: "submit_timing",
      arguments: timing,
    });
    expect(submission.isError).toBeUndefined();
    const approval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "timing" },
    });
    expect(approval.isError).toBeUndefined();
  }

  test("all tools are listed", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("submit_drafted_questions");
    expect(names).toContain("submit_selected_unit");
    expect(names).toContain("submit_timing");
    expect(names).not.toContain("propose_timing");
    expect(names).toContain("submit_defined_terms");
    expect(names).not.toContain("propose_resolution_sources");
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
      ["submit_timing", false],
      ["submit_defined_terms", false],
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

  test("drafted-question follow-up guidance puts timing before terms", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const properties = tools.find(
      (tool) => tool.name === "submit_drafted_questions",
    )!.inputSchema?.properties as Record<string, JsonSchema>;
    const description = properties.followUp?.description;

    expect(description).toContain("first propose and review its timing");
    expect(description).toContain("only after timing is approved");
    expect(description).not.toContain(
      "about the next step: once the user is satisfied and selects a unit",
    );
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

  test("submit_timing advertises the complete timing payload schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "submit_timing")!;
    expect(tool.outputSchema).toBeDefined();
    for (const property of [
      "unit_number",
      "selected_unit",
      "timing_type",
      "event_deadline",
      "observation_start",
      "observation_end",
      "boundary",
      "time_zone",
      "evidence_rule",
      "trading",
      "expiration",
      "followUp",
      "contract_id",
    ]) {
      expect(tool.outputSchema?.properties).toHaveProperty(property);
    }
  });

  test("submit_timing renders the complete timing submission in proposal shape", async () => {
    const client = await connectClient();
    const selectedUnit = {
      type: "binary" as const,
      question: "Will the Fed cut rates in 2026?",
    };
    const draft = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [selectedUnit],
        followUp: "Which unit should we use?",
      },
    });
    const contractId = expectStoredPayload(draft, {
      units: [selectedUnit],
      followUp: "Which unit should we use?",
    });
    await submitAndApproveSelectedUnit(client, contractId, 1, selectedUnit);

    const timing = {
      contract_id: contractId,
      unit_number: 1,
      selected_unit: selectedUnit,
      timing_type: "point_in_time" as const,
      event_deadline: "2026-12-31T23:59:59Z",
      boundary: { end: "inclusive" as const },
      time_zone: "Europe/Berlin",
      evidence_rule: "both" as const,
      trading: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-12-30T23:59:59Z",
        time_zone: "Europe/Berlin",
      },
      expiration: {
        datetime: "2027-01-02T00:00:00Z",
        time_zone: "Europe/Berlin",
      },
      followUp: "Do you approve this complete timing proposal?",
    };
    const submission = await client.callTool({
      name: "submit_timing",
      arguments: timing,
    });
    expect(submission.isError).toBeUndefined();
    expect(submission.structuredContent).toMatchObject(timing);
    const proposalText = (
      submission.content as Array<{ type: string; text: string }>
    )[0]!.text;
    expect(proposalText).toContain("**Timing proposal**");
    expect(proposalText).toContain("Trading opens");
    expect(proposalText).toContain("Trading closes");
    expect(proposalText).toContain("Event deadline");
    expect(proposalText).toContain("Contract expires");
    expect(proposalText).toContain("**Key rules**");
    expect(proposalText).toContain("| Event type | Point-in-time event |");
    expect(proposalText).toContain("| Evidence rule | both |");
    expect(proposalText).toContain(
      "---\n\nDo you approve this complete timing proposal?",
    );
    expect(proposalText).not.toContain("### Submitted Timing");
    expect(proposalText).not.toContain("### Definitions");

    const pending = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(pending.isError).toBeUndefined();
    expect(pending.structuredContent).not.toHaveProperty("timing");

    const approval = await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "timing" },
    });
    expect(approval.isError).toBeUndefined();

    const recalled = await client.callTool({
      name: "get_approved_event_contract",
      arguments: { contract_id: contractId },
    });
    expect(recalled.structuredContent).toMatchObject({
      contract_id: contractId,
      timing: {
        timing_type: timing.timing_type,
        event_deadline: timing.event_deadline,
        boundary: timing.boundary,
        time_zone: timing.time_zone,
        evidence_rule: timing.evidence_rule,
        trading: timing.trading,
        expiration: timing.expiration,
      },
    });
    expect(
      (recalled.structuredContent as Record<string, unknown>).timing,
    ).not.toHaveProperty("followUp");
    expect(
      (recalled.content as Array<{ type: string; text: string }>)[0]!.text,
    ).toContain("### Approved Timing");
  });

  test("submit_timing requires selected-unit approval", async () => {
    const client = await connectClient();
    const selectedUnit = {
      type: "binary" as const,
      question: "Will the Fed cut rates in 2026?",
    };
    const draft = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [selectedUnit],
        followUp: "Which unit should we use?",
      },
    });
    const contractId = expectStoredPayload(draft, {
      units: [selectedUnit],
      followUp: "Which unit should we use?",
    });
    const submission = await client.callTool({
      name: "submit_timing",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
        timing_type: "point_in_time",
        event_deadline: "2026-12-31T23:59:59Z",
        boundary: { end: "inclusive" },
        time_zone: "UTC",
        evidence_rule: "occurrence",
        trading: {
          start: "2026-01-01T00:00:00Z",
          end: "2026-12-30T23:59:59Z",
          time_zone: "UTC",
        },
        expiration: {
          datetime: "2027-01-02T00:00:00Z",
          time_zone: "UTC",
        },
        followUp: "Do you approve this timing?",
      },
    });
    expect(submission.isError).toBe(true);
    expect(
      (submission.content as Array<{ type: string; text: string }>)[0]!.text,
    ).toContain("selected_unit must be approved first");
  });

  test("submit_timing preserves measurement boundaries and rejects invalid ordering", async () => {
    const client = await connectClient();
    const selectedUnit = {
      type: "binary" as const,
      question: "Will CPI exceed 3 percent during 2026?",
    };
    const draft = await client.callTool({
      name: "submit_drafted_questions",
      arguments: {
        units: [selectedUnit],
        followUp: "Which unit should we use?",
      },
    });
    const contractId = expectStoredPayload(draft, {
      units: [selectedUnit],
      followUp: "Which unit should we use?",
    });
    await submitAndApproveSelectedUnit(client, contractId, 1, selectedUnit);

    const valid = await client.callTool({
      name: "submit_timing",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
        timing_type: "measurement",
        observation_start: "2026-01-01T00:00:00Z",
        observation_end: "2026-12-31T23:59:59Z",
        boundary: { start: "inclusive", end: "exclusive" },
        time_zone: "Europe/Berlin",
        evidence_rule: "publication",
        trading: {
          start: "2026-01-01T00:00:00Z",
          end: "2026-12-30T23:59:59Z",
          time_zone: "Europe/Berlin",
        },
        expiration: {
          datetime: "2027-01-02T00:00:00Z",
          time_zone: "Europe/Berlin",
        },
        followUp: "Do you approve this measurement timing?",
      },
    });
    expect(valid.isError).toBeUndefined();
    expect(valid.structuredContent).toMatchObject({
      timing_type: "measurement",
      observation_start: "2026-01-01T00:00:00Z",
      observation_end: "2026-12-31T23:59:59Z",
      boundary: { start: "inclusive", end: "exclusive" },
    });

    const invalid = await client.callTool({
      name: "submit_timing",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
        timing_type: "measurement",
        observation_start: "2026-12-31T23:59:59Z",
        observation_end: "2026-01-01T00:00:00Z",
        boundary: { start: "inclusive", end: "exclusive" },
        time_zone: "UTC",
        evidence_rule: "occurrence",
        trading: {
          start: "2026-01-01T00:00:00Z",
          end: "2026-12-30T23:59:59Z",
          time_zone: "UTC",
        },
        expiration: {
          datetime: "2027-01-02T00:00:00Z",
          time_zone: "UTC",
        },
        followUp: "Do you approve this timing?",
      },
    });
    expect(invalid.isError).toBe(true);
  });

  test("recall schema exposes only approved contract content", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "get_approved_event_contract")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("timing");
    expect(tool.outputSchema?.properties).toHaveProperty("definitions");
    expect(tool.outputSchema?.properties).not.toHaveProperty(
      "proposed_resolution_sources",
    );
    expect(tool.outputSchema?.properties).toHaveProperty("resolution_sources");
    expect(tool.outputSchema?.properties).not.toHaveProperty(
      "drafted_questions",
    );
  });

  test("stores every workflow stage and recalls only approved contract content", async () => {
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
    await submitAndApproveTiming(client, contractId, 1, selectedUnit);

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
      timing: {
        timing_type: "point_in_time",
        event_deadline: "2026-12-31T23:59:59Z",
      },
      definitions: definitionsInput.definitions,
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
    expect(content[0]!.text).toContain("### Approved Timing");
    expect(content[0]!.text).toContain("### Approved Definitions");
    expect(content[0]!.text).not.toContain("### Drafted Questions");
    expect(content[0]!.text).not.toContain("### Defined Terms");
    expect(content[0]!.text).toContain("### Resolution Sources");
    expect(content[0]!.text).not.toContain("### Detailed Resolution Sources");
    expect(content[0]!.text).toContain("**cut rates**");
    expect(content[0]!.text).toContain("Federal Reserve decisions");
    expect(content[0]!.text).not.toContain("Will the ECB cut rates in 2026?");
    expect(content[0]!.text).not.toContain(definitionsInput.followUp);
    expect(content[0]!.text).not.toContain(resolutionInput.followUp);
    expect(content[0]!.text.match(/\*\*Selected Unit 1:/g)).toHaveLength(1);
  });

  test("requires explicit timing approval before definitions approval", async () => {
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
      name: "submit_selected_unit",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: selectedUnit,
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: { contract_id: contractId, stage: "selected_unit" },
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
    ).toContain("timing must be approved first");
  });

  test("retries replace a stage and clear downstream snapshots", async () => {
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
      name: "submit_resolution_source",
      arguments: {
        contract_id: contractId,
        unit_number: 1,
        selected_unit: draft.units[0],
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
          }
        ],
        followUp: "Does this source hierarchy look right?",
      },
    });
    await client.callTool({
      name: "approve_event_contract",
      arguments: {
        contract_id: contractId,
        stage: "resolution_sources",
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

  test("submit_resolution_source allows a primary-only hierarchy with a warning", async () => {
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
      "If selected: treat this display-question proposal as Unit 2, then continue with define-timing and define-terms from scratch",
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
