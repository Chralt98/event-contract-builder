import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.ts";

describe("draft-display-question prompt", () => {
  async function connectClient() {
    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client({ name: "test-client", version: "0.1.0" });
    await client.connect(clientTransport);
    return client;
  }

  test("is listed in available prompts", async () => {
    const client = await connectClient();
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toContain("draft-display-question");
  });

  test("prompt accepts a single text argument", async () => {
    const client = await connectClient();
    const { prompts } = await client.listPrompts();
    const prompt = prompts.find(
      (p) => p.name === "draft-display-question",
    )!;
    const argNames = prompt.arguments!.map((a) => a.name);
    expect(argNames).toEqual(["text"]);
  });

  test("returns a user message containing the input text and instructions", async () => {
    const client = await connectClient();
    const input =
      "CPI year-over-year inflation might exceed 3 percent in June 2026";

    const result = await client.getPrompt({
      name: "draft-display-question",
      arguments: { text: input },
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe("user");

    const text =
      result.messages[0]!.content.type === "text"
        ? result.messages[0]!.content.text
        : "";
    expect(text).toContain(input);
    expect(text).toContain("prediction market product copywriter");
    expect(text).toContain("prediction market platforms");
  });
});
