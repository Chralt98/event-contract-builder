import { createServer as createHttpServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  DraftUnit,
  Definitions,
  type DraftUnitT,
} from "../../src/schema/display-question";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Renders a selected unit as a numbered, typed header followed by its
 * question bullets, e.g. "**Selected Unit 2: Categorical market**\n- ...".
 */
function renderUnitHeader(unit: DraftUnitT, unitNumber: number): string {
  const label =
    unit.type === "binary"
      ? "Binary market"
      : unit.type === "scalar"
        ? "Scalar market"
        : "Categorical market";
  const questions = unit.type === "binary" ? [unit.question] : unit.questions;
  const bullets = questions.map((q) => `- ${q}`).join("\n");
  return `**Selected Unit ${unitNumber}: ${label}**\n${bullets}`;
}

const definedTermsShape = {
  unit_number: z
    .number()
    .int()
    .describe(
      "The 1-based number of the selected unit as shown in the prior draft.",
    ),
  selected_unit: DraftUnit.describe(
    "The selected market unit being defined — same structure as a unit from submit_drafted_questions.",
  ),
  definitions: Definitions.describe(
    "Map from each ambiguous term to its precise, unambiguous definition.",
  ),
  followUp: z
    .string()
    .describe(
      "A follow-up question asking the user whether they agree with the " +
        "definitions or would like to change anything.",
    ),
};

const draftDisplayQuestionsOutputShape = {
  units: z
    .array(DraftUnit)
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
      const sections = args.units.map((unit, index) => {
        const n = index + 1;
        if (unit.type === "binary") {
          return `**Unit ${n}: Binary market**\n- ${unit.question}`;
        }
        const label =
          unit.type === "scalar" ? "Scalar market" : "Categorical market";
        const bullets = unit.questions.map((q) => `- ${q}`).join("\n");
        return `**Unit ${n}: ${label}**\n${bullets}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text: [...sections, "---", args.followUp].join("\n\n"),
          },
        ],
        structuredContent: args,
      };
    },
  );

  server.registerTool(
    "define_terms",
    {
      title: "Define Terms",
      description:
        "Identify ambiguous terms in a selected market unit and propose " +
        "precise definitions for each. Use whenever the user selects, confirms, " +
        "or chooses a market unit.",
      inputSchema: {
        unit_number: z
          .number()
          .int()
          .describe(
            "The 1-based number of the selected unit as shown in the prior draft.",
          ),
        selected_unit: DraftUnit.describe(
          "The market unit to analyze for ambiguous terms — same structure as a unit from submit_drafted_questions",
        ),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const unit = args.selected_unit;
      const unitText =
        unit.type === "binary" ? unit.question : unit.questions.join("\n");
      return {
        content: [
          {
            type: "text" as const,
            text: [
              renderUnitHeader(unit, args.unit_number),
              loadPrompt("generate-definitions", { text: unitText }),
            ].join("\n\n"),
          },
        ],
      };
    },
  );

  server.registerTool(
    "submit_defined_terms",
    {
      title: "Submit Defined Terms",
      description:
        "Validate and register a set of term definitions for the event contract. " +
        "Call this once after defining terms, passing the definitions as a " +
        "term-to-definition map.",
      inputSchema: definedTermsShape,
      outputSchema: definedTermsShape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    (args) => {
      const unitHeader = renderUnitHeader(args.selected_unit, args.unit_number);
      const lines = Object.entries(args.definitions).map(
        ([term, definition]) => `**${term}** — ${definition}`,
      );
      return {
        content: [
          {
            type: "text" as const,
            text: [
              unitHeader,
              "---",
              lines.join("\n"),
              "---",
              args.followUp,
            ].join("\n\n"),
          },
        ],
        structuredContent: args,
      };
    },
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
