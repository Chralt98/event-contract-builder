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
    expect(names).toContain("draft-display-questions");
  });

  test("prompt accepts a single text argument", async () => {
    const client = await connectClient();
    const { prompts } = await client.listPrompts();
    const prompt = prompts.find((p) => p.name === "draft-display-questions")!;
    const argNames = prompt.arguments!.map((a) => a.name);
    expect(argNames).toEqual(["text"]);
  });

  test("returns a user message containing the input text and instructions", async () => {
    const client = await connectClient();
    const input =
      "CPI year-over-year inflation might exceed 3 percent in June 2026";

    const result = await client.getPrompt({
      name: "draft-display-questions",
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

  test("define-resolution-source prompt is listed and renders its inputs", async () => {
    const client = await connectClient();
    const { prompts } = await client.listPrompts();
    const prompt = prompts.find((p) => p.name === "define-resolution-source")!;
    expect(prompt).toBeDefined();
    const argNames = prompt.arguments!.map((a) => a.name);
    expect(argNames).toContain("text");
    expect(argNames).toContain("definitions");

    const result = await client.getPrompt({
      name: "define-resolution-source",
      arguments: {
        text: "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
        definitions: "**CPI** — The CPI-U all-items index, NSA, from the BLS.",
      },
    });

    const text =
      result.messages[0]!.content.type === "text"
        ? result.messages[0]!.content.text
        : "";
    expect(text).toContain(
      "Will U.S. CPI rise 3%+ year-over-year in June 2026?",
    );
    expect(text).toContain("**CPI** — The CPI-U all-items index");
    expect(text).toContain("prediction market resolution designer");
    // Two-turn staging: names-only first, submit only after approval.
    expect(text).toContain("Turn 1 — propose the hierarchy (names only)");
    expect(text).toContain("Turn 2 — detail and register");
    expect(text).toMatch(/Do \*\*not\*\* call `submit_resolution_source`/);
  });
});
