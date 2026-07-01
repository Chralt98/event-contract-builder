import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDraftDisplayQuestionsTool } from "./tools/draft-display-questions";
import { registerSubmitDraftedQuestionsTool } from "./tools/submit-drafted-questions";
import { registerDefineTermsTool } from "./tools/define-terms";
import { registerSubmitDefinedTermsTool } from "./tools/submit-defined-terms";
import { registerDraftDisplayQuestionsPrompt } from "./prompts/draft-display-questions";
import { registerGenerateDefinitionsPrompt } from "./prompts/generate-definitions";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const instructions = readFileSync(
    join(__dirname, "templates", "instructions.md"),
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

  registerDraftDisplayQuestionsTool(server);
  registerSubmitDraftedQuestionsTool(server);
  registerDefineTermsTool(server);
  registerSubmitDefinedTermsTool(server);
  registerDraftDisplayQuestionsPrompt(server);
  registerGenerateDefinitionsPrompt(server);

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
