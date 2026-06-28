import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPrompt(name: string, vars: Record<string, string>): string {
  let template = readFileSync(
    join(__dirname, "prompts", `${name}.md`),
    "utf-8",
  );
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }
  return template;
}

export function createServer() {
  const instructions = readFileSync(
    join(__dirname, "prompts", "instructions.md"),
    "utf-8",
  );

  const server = new McpServer(
    {
      name: "event-contract-builder",
      version: "0.1.0",
    },
    {
      instructions,
      capabilities: { prompts: {}, tools: {} },
    },
  );

  server.registerTool(
    "draft_display_questions",
    {
      title: "Draft Display Questions",
      description:
        "Draft new prediction market display questions from a free-form " +
        "event description. Use only when the user is describing a new event " +
        "to turn into questions — not when they are selecting among questions " +
        "that already exist.",
      inputSchema: {
        event_description: z
          .string()
          .describe(
            "Free-form text describing the event, outcome, or forecast to " +
              "turn into display questions",
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => ({
      content: [
        {
          type: "text" as const,
          text: loadPrompt("generate-display-question", {
            text: args.event_description,
          }),
        },
      ],
    }),
  );

  server.registerTool(
    "define_question_terms",
    {
      title: "Define Question Terms",
      description:
        "Identify ambiguous terms in a display question the user has selected " +
        "and propose precise definitions for each. Use whenever the user " +
        "selects, confirms, or chooses a display question.",
      inputSchema: {
        selected_question: z
          .string()
          .describe(
            "The display question the user selected, to analyze for ambiguous terms",
          ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => ({
      content: [
        {
          type: "text" as const,
          text: loadPrompt("generate-definitions", {
            text: args.selected_question,
          }),
        },
      ],
    }),
  );

  server.registerPrompt(
    "generate-display-question",
    {
      title: "Generate Display Question",
      description:
        "Generate a prediction market display question from free-form text input.",
      argsSchema: {
        text: z
          .string()
          .describe(
            "Free-form text describing the event, outcome, or forecast to turn into a display question",
          ),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("generate-display-question", {
              text: args.text,
            }),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "generate-definitions",
    {
      title: "Generate Definitions",
      description:
        "Identify ambiguous terms in a prediction market display question and propose precise definitions for each.",
      argsSchema: {
        text: z
          .string()
          .describe("The prediction market display question to analyze"),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("generate-definitions", { text: args.text }),
          },
        },
      ],
    }),
  );

  return server;
}

const PORT = parseInt(process.env["PORT"] ?? "8787", 10);

async function main() {
  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (url.pathname !== "/mcp") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    if (req.method === "POST") {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    if (req.method === "GET") {
      res.writeHead(405, { Allow: "POST" });
      res.end("SSE not supported in stateless mode");
      return;
    }

    if (req.method === "DELETE") {
      res.writeHead(405, { Allow: "POST" });
      res.end("Session deletion not supported in stateless mode");
      return;
    }

    res.writeHead(405, { Allow: "POST" });
    res.end("Method not allowed");
  });

  httpServer.listen(PORT, () => {
    console.log(`MCP server listening on http://localhost:${PORT}/mcp`);
  });
}

const isMain = fileURLToPath(import.meta.url) === (globalThis.Bun?.main ?? "");
if (isMain) {
  main().catch(console.error);
}
