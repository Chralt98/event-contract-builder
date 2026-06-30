import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * A selectable draft unit. A scalar or categorical market is selected as a
 * whole, so it carries several question strings; a binary market is one
 * standalone question.
 */
const draftUnitSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("binary"),
    question: z
      .string()
      .describe("The single Yes/No display question, ending in '?'."),
  }),
  z.object({
    type: z.literal("scalar"),
    questions: z
      .array(z.string())
      .describe(
        "One binary question per numeric range. Ranges must not overlap and " +
          "should cover the plausible space so exactly one resolves Yes.",
      ),
  }),
  z.object({
    type: z.literal("categorical"),
    questions: z
      .array(z.string())
      .describe(
        "One binary question per mutually exclusive option; each asks whether " +
          "that option occurs.",
      ),
  }),
]);

const draftDisplayQuestionsOutputShape = {
  units: z
    .array(draftUnitSchema)
    .describe(
      "The drafted markets, each a single selectable unit: a binary question, " +
        "or the complete set of questions for one scalar or categorical market.",
    ),
  followUp: z
    .string()
    .describe(
      "The required follow-up line asking which unit to use for further " +
        "specification, or how the draft should be revised.",
    ),
};

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
          text: loadPrompt("draft-display-questions", {
            text: args.event_description,
          }),
        },
      ],
    }),
  );

  server.registerTool(
    "submit_drafted_questions",
    {
      title: "Submit Drafted Questions",
      description:
        "Validate and register a drafted set of display questions, " +
        "organized into binary/scalar/categorical units per " +
        "draft_display_questions guidance. Call this once after drafting " +
        "questions for a new event, passing the same draft as structured " +
        "units.",
      inputSchema: draftDisplayQuestionsOutputShape,
      outputSchema: draftDisplayQuestionsOutputShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const lines = args.units.flatMap((unit) =>
        unit.type === "binary" ? [unit.question] : unit.questions,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: [...lines, "", args.followUp].join("\n"),
          },
        ],
        structuredContent: args,
      };
    },
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
    "draft-display-questions",
    {
      title: "Draft Display Questions",
      description:
        "Draft prediction market display questions from free-form text input.",
      argsSchema: {
        text: z
          .string()
          .describe(
            "Free-form text describing the event, outcome, or forecast to turn into display questions",
          ),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: loadPrompt("draft-display-questions", {
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
