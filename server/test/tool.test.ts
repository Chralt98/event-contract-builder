import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";

/**
 * submit_resolution_source runs a live reachability check on each source URL.
 * Stub global fetch so these tests never touch the network and can drive the
 * advisory link-check output deterministically.
 */
let fetchSpy: ReturnType<typeof spyOn> | undefined;

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
    expect(names).toContain("draft_display_questions");
    expect(names).toContain("submit_drafted_questions");
    expect(names).toContain("define_terms");
    expect(names).toContain("submit_defined_terms");
    expect(names).toContain("define_resolution_source");
    expect(names).toContain("submit_resolution_source");
  });

  test("tools are annotated as read-only and idempotent", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    for (const name of [
      "draft_display_questions",
      "submit_drafted_questions",
      "define_terms",
      "submit_defined_terms",
      "define_resolution_source",
      "submit_resolution_source",
    ]) {
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.idempotentHint).toBe(true);
    }
  });

  test("draft_display_questions returns display-question guidance", async () => {
    const client = await connectClient();
    const input = "Fed cuts rates by 50bps before end of 2026";

    const result = await client.callTool({
      name: "draft_display_questions",
      arguments: { event_description: input },
    });

    const text = result.content as Array<{ type: string; text: string }>;
    expect(text).toHaveLength(1);
    expect(text[0]!.type).toBe("text");
    expect(text[0]!.text).toContain(input);
    expect(text[0]!.text).toContain("prediction market product copywriter");
  });

  test("submit_drafted_questions advertises an output schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "submit_drafted_questions")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("units");
    expect(tool.outputSchema?.properties).toHaveProperty("followUp");
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

  test("define_terms echoes the selected unit and returns definitions guidance", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "define_terms",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will the Fed cut rates 50+ bps by end of 2026?",
        },
      },
    });

    const text = result.content as Array<{ type: string; text: string }>;
    expect(text).toHaveLength(1);
    expect(text[0]!.type).toBe("text");
    expect(text[0]!.text).toContain(
      "**Selected Unit 1: Binary market**\n- Will the Fed cut rates 50+ bps by end of 2026?",
    );
    expect(text[0]!.text).toContain("prediction market event contract analyst");
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
      "Will the Fed cut rates 50+ bps by end of 2026?\n\n---\n\n### Definitions\n\n**50+ bps** —",
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

  test("define_resolution_source echoes the unit, definitions, and returns source guidance", async () => {
    const client = await connectClient();

    const result = await client.callTool({
      name: "define_resolution_source",
      arguments: {
        unit_number: 1,
        selected_unit: {
          type: "binary",
          question: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        },
        definitions: {
          CPI: "The CPI-U all-items index, not seasonally adjusted, published by the BLS.",
        },
      },
    });

    const text = result.content as Array<{ type: string; text: string }>;
    expect(text).toHaveLength(1);
    expect(text[0]!.type).toBe("text");
    expect(text[0]!.text).toContain(
      "**Selected Unit 1: Binary market**\n- Will U.S. CPI rise 3%+ year-over-year in June 2026?",
    );
    expect(text[0]!.text).toContain("**CPI** — The CPI-U all-items index");
    expect(text[0]!.text).toContain("prediction market resolution designer");
  });

  test("submit_resolution_source advertises an output schema", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "submit_resolution_source")!;
    expect(tool.outputSchema).toBeDefined();
    expect(tool.outputSchema?.properties).toHaveProperty("unit_number");
    expect(tool.outputSchema?.properties).toHaveProperty("selected_unit");
    expect(tool.outputSchema?.properties).toHaveProperty("sources");
    expect(tool.outputSchema?.properties).toHaveProperty("followUp");
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
      ],
      followUp: "Does this source look right?",
    };
    stubFetch(
      () => new Response(null, { status: 404, statusText: "Not Found" }),
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
      ],
      followUp: "Does this source look right?",
    };
    stubFetch(() => {
      throw new Error("getaddrinfo ENOTFOUND");
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
