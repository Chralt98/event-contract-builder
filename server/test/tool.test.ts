import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";

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
    expect(names).toContain("define_question_terms");
  });

  test("tools are annotated as read-only and idempotent", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    for (const name of [
      "draft_display_questions",
      "submit_drafted_questions",
      "define_question_terms",
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

  test("define_question_terms returns definitions guidance", async () => {
    const client = await connectClient();
    const input = "Will the Fed cut rates 50+ bps by end of 2026?";

    const result = await client.callTool({
      name: "define_question_terms",
      arguments: { selected_question: input },
    });

    const text = result.content as Array<{ type: string; text: string }>;
    expect(text).toHaveLength(1);
    expect(text[0]!.type).toBe("text");
    expect(text[0]!.text).toContain(input);
    expect(text[0]!.text).toContain("prediction market contract analyst");
  });
});
