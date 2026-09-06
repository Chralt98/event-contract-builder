import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";

/**
 * Resolution-source tools run live URL checks. Stub global fetch so these
 * tests never touch the network and can drive proposal preflight and advisory
 * submission output deterministically.
 */
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
  async function connectClient() {
    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.1.0" });
    await client.connect(clientTransport);
    return client;
  }

  test("all tools are listed", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("submit_drafted_questions");
    expect(names).toContain("submit_defined_terms");
    expect(names).toContain("propose_resolution_sources");
    expect(names).toContain("submit_resolution_source");
  });

  test("does not expose semantic workflow prompts", async () => {
    const client = await connectClient();
    await expect(client.listPrompts()).rejects.toThrow("Method not found");
  });

  test("tools are annotated as read-only and idempotent", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    for (const name of [
      "submit_drafted_questions",
      "submit_defined_terms",
      "propose_resolution_sources",
      "submit_resolution_source",
    ]) {
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.idempotentHint).toBe(true);
    }
  });

  test("draft-unit tool schemas avoid unsupported oneOf and pattern constraints", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const propertiesFor = (name: string) =>
      tools.find((tool) => tool.name === name)!.inputSchema?.properties as
        | Record<string, JsonSchema>
        | undefined;
    const unitSchemas = [
      propertiesFor("submit_drafted_questions")?.units?.items,
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

    expect(result.structuredContent).toEqual(draft);

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
          type: "scalar",
          questions: [
            "Will Bitcoin close 2026 below $50k?",
            "Will Bitcoin close 2026 above $50k?",
          ],
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
      "**Unit 3: Scalar market**\n- Will Bitcoin close 2026 below $50k?",
    );
    expect(text).toContain(
      "**Unit 4: Binary market**\n- Will the Fed raise rates in 2026?",
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

    expect(result.structuredContent).toEqual(draft);
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

    expect(result.structuredContent).toEqual(input);

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

    expect(result.structuredContent).toEqual(input);
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

    expect(result.structuredContent).toEqual(input);
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

    expect(result.structuredContent).toEqual(input);

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
    expect(result.structuredContent).toEqual(input);
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

    expect(result.structuredContent).toEqual(input);

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
    // Every reachable URL gets a link-check bullet; no warning line when all ok.
    expect(text).toContain("- Link check: ✓ 200");
    expect(text).not.toContain("could not be automatically verified");
    expect(text).toContain("---\n\n" + input.followUp);
  });

  test("submit_resolution_source flags an unreachable URL without blocking registration", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          id: "bls-cpi",
          rank: 1,
          controlsFor: ["headline CPI value"],
          name: "BLS Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://www.bls.gov/cpi/typo",
          publicationSchedule:
            "Monthly, around the middle of the following month.",
          publiclyAccessible: true,
          independenceNote:
            "A federal statistical agency independent of any prediction market participant.",
        },
        {
          id: "fred-cpi-backup",
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
      ],
      followUp: "Does this source look right?",
    };
    stubFetch((url) =>
      url.endsWith("/typo")
        ? new Response(null, { status: 404, statusText: "Not Found" })
        : new Response(null, { status: 200 }),
    );
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: input,
    });

    // Advisory only: the submission still succeeds and echoes the sources.
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(input);

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain("- Link check: ✗ 404 Not Found");
    expect(text).toContain("could not be automatically verified");
  });

  test("submit_resolution_source reports a connection failure as unreachable", async () => {
    const input = {
      unit_number: 1,
      selected_unit: {
        type: "binary" as const,
        question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
      },
      sources: [
        {
          id: "bls-cpi",
          rank: 1,
          controlsFor: ["headline CPI value"],
          name: "BLS Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://not-a-real-host.invalid/cpi",
          publicationSchedule:
            "Monthly, around the middle of the following month.",
          publiclyAccessible: true,
          independenceNote:
            "A federal statistical agency independent of any prediction market participant.",
        },
        {
          id: "fred-cpi-backup",
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
      ],
      followUp: "Does this source look right?",
    };
    stubFetch((url) => {
      if (url.includes("not-a-real-host")) {
        throw new Error("getaddrinfo ENOTFOUND");
      }
      return new Response(null, { status: 200 });
    });
    const client = await connectClient();

    const result = await client.callTool({
      name: "submit_resolution_source",
      arguments: input,
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const text = content[0]!.text;
    expect(text).toContain("- Link check: ✗ unreachable (connection failed)");
    expect(text).toContain("could not be automatically verified");
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
    stubFetch(() => new Response(null, { status: 200 }));
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
    expect(result.structuredContent).toEqual(input);
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
