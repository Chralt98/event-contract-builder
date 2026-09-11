import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerSubmitDraftedQuestionsTool } from "./tools/submit-drafted-questions";
import { registerSubmitSelectedUnitTool } from "./tools/submit-selected-unit";
import { registerSubmitTimingTool } from "./tools/submit-timing";
import { registerSubmitDefinedTermsTool } from "./tools/submit-defined-terms";
import { registerProposeResolutionSourcesTool } from "./tools/propose-resolution-sources";
import { registerSubmitResolutionSourceTool } from "./tools/submit-resolution-source";
import { registerApproveEventContractTool } from "./tools/approve-event-contract";
import { registerGetApprovedEventContractTool } from "./tools/get-approved-event-contract";
import {
  ApprovedContractHandoffStore,
  ApprovedContractStore,
} from "./approved-contract-store";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer(store = new ApprovedContractStore()) {
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
      capabilities: { tools: {} },
    },
  );

  registerSubmitDraftedQuestionsTool(server, store);
  registerSubmitSelectedUnitTool(server, store);
  registerSubmitTimingTool(server, store);
  registerSubmitDefinedTermsTool(server, store);
  registerProposeResolutionSourcesTool(server, store);
  registerSubmitResolutionSourceTool(server, store);
  registerApproveEventContractTool(server, store);
  registerGetApprovedEventContractTool(server, store);

  return server;
}

const PORT = parseInt(process.env["PORT"] ?? "8787", 10);

type HttpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const sessions = new Map<string, HttpSession>();
// HTTP clients may create a fresh MCP session for each tool call. Keep
// cross-session continuation opt-in through the explicit contract_id bearer
// handoff; each session still owns its own implicit lookup scope.
const httpHandoffStore = new ApprovedContractHandoffStore();

async function createHttpSession(): Promise<HttpSession> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const session: HttpSession = {
    server: createServer(new ApprovedContractStore(httpHandoffStore)),
    transport,
  };

  // The SDK wraps an existing onclose callback when the server connects, so
  // install cleanup before connecting the server to this transport.
  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId) sessions.delete(sessionId);
  };
  await session.server.connect(transport);
  return session;
}

function requestSessionId(
  req: import("node:http").IncomingMessage,
): string | undefined {
  const value = req.headers["mcp-session-id"];
  return Array.isArray(value) ? value[0] : value;
}

function writeSessionNotFound(res: import("node:http").ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("MCP session not found");
}

async function main() {
  const httpServer = createHttpServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (url.pathname !== "/mcp") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const sessionId = requestSessionId(req);

    if (req.method === "POST") {
      let session = sessionId ? sessions.get(sessionId) : undefined;
      if (sessionId && !session) {
        writeSessionNotFound(res);
        return;
      }

      session ??= await createHttpSession();
      await session.transport.handleRequest(req, res);

      // Initialization assigns the ID before the transport writes its
      // response headers. Registering afterward makes all later POST/GET/
      // DELETE requests resolve to the same server and store.
      const initializedSessionId = session.transport.sessionId;
      if (initializedSessionId) {
        sessions.set(initializedSessionId, session);
      } else if (!sessionId) {
        await session.transport.close();
      }
      return;
    }

    if (req.method === "GET") {
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session) {
        writeSessionNotFound(res);
        return;
      }
      await session.transport.handleRequest(req, res);
      return;
    }

    if (req.method === "DELETE") {
      const session = sessionId ? sessions.get(sessionId) : undefined;
      if (!session) {
        writeSessionNotFound(res);
        return;
      }
      await session.transport.handleRequest(req, res);
      if (sessionId) sessions.delete(sessionId);
      return;
    }

    res.writeHead(405, { Allow: "GET, POST, DELETE" });
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
