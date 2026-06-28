import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";

describe("generate_display_question tool", () => {
  async function connectClient() {
    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.1.0" });
    await client.connect(clientTransport);
    return client;
  }

  test("is listed in available tools", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("generate_display_question");
  });

  test("tool is annotated as read-only and idempotent", async () => {
    const client = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "generate_display_question")!;
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.idempotentHint).toBe(true);
  });

  test("returns prompt guidance containing the input text", async () => {
    const client = await connectClient();
    const input = "Fed cuts rates by 50bps before end of 2026";

    const result = await client.callTool({
      name: "generate_display_question",
      arguments: { text: input },
    });

    const text = result.content as Array<{ type: string; text: string }>;
    expect(text).toHaveLength(1);
    expect(text[0]!.type).toBe("text");
    expect(text[0]!.text).toContain(input);
    expect(text[0]!.text).toContain("prediction market product copywriter");
  });
});
