import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index";

/**
 * Start the same MCP server over the SDK's Stdio transport.
 *
 * Keep application diagnostics on stderr: stdout is reserved for MCP
 * protocol messages when a client or tunnel supervises this process.
 */
export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain = fileURLToPath(import.meta.url) === (globalThis.Bun?.main ?? "");
if (isMain) {
  startStdioServer().catch((error: unknown) => {
    console.error("MCP Stdio server failed:", error);
    process.exitCode = 1;
  });
}
