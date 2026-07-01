import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadPrompt } from "../render";

export function registerDefineResolutionSourcePrompt(server: McpServer): void {
  server.registerPrompt(
    "define-resolution-source",
    {
      title: "Define Resolution Source",
      description:
        "Identify the authoritative data source(s) that will settle a selected " +
        "market unit and rank them into a fixed fallback hierarchy.",
      argsSchema: {
        text: z
          .string()
          .describe("The selected market unit's display question(s) to source"),
        definitions: z
          .string()
          .optional()
          .describe(
            "The agreed term definitions for the unit, as a markdown glossary",
          ),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("define-resolution-source", {
              unitHeader: args.text,
              definitions: args.definitions ?? "_None provided._",
            }),
          },
        },
      ],
    }),
  );
}
