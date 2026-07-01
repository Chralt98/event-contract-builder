import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { DraftUnitT } from "../../src/schema/display-question";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Loads a markdown prompt template and substitutes `{{var}}` placeholders. */
export function loadPrompt(name: string, vars: Record<string, string>): string {
  let template = readFileSync(
    join(__dirname, "templates", `${name}.md`),
    "utf-8",
  );
  for (const [key, value] of Object.entries(vars)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }
  return template;
}

/**
 * Renders a selected unit as a numbered, typed header followed by its
 * question bullets, e.g. "**Selected Unit 2: Categorical market**\n- ...".
 */
export function renderUnitHeader(unit: DraftUnitT, unitNumber: number): string {
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
