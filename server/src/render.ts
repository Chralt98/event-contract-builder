import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import type {
  DraftUnitT,
  DefinitionsT,
} from "../../src/schema/display-question";
import type { DataSource } from "../../src/schema/resolution";

type DataSourceT = z.infer<typeof DataSource>;

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

/** Human label for a draft unit's market type. */
function unitLabel(unit: DraftUnitT): string {
  return unit.type === "binary"
    ? "Binary market"
    : unit.type === "scalar"
      ? "Scalar market"
      : "Categorical market";
}

/** A unit's question(s) rendered as `- ` bullets, one per line. */
function unitBullets(unit: DraftUnitT): string {
  const questions = unit.type === "binary" ? [unit.question] : unit.questions;
  return questions.map((q) => `- ${q}`).join("\n");
}

/**
 * Renders a selected unit as a numbered, typed header followed by its
 * question bullets, e.g. "**Selected Unit 2: Categorical market**\n- ...".
 */
export function renderUnitHeader(unit: DraftUnitT, unitNumber: number): string {
  return `**Selected Unit ${unitNumber}: ${unitLabel(unit)}**\n${unitBullets(unit)}`;
}

/**
 * Renders a drafted set of selectable units as 1-based `**Unit N: <type>
 * market**` headings — in array order — each followed by its question bullets,
 * blocks separated by a blank line. This is the draft list the user picks a
 * unit from, distinct from the singular "Selected Unit" header above.
 */
export function renderDraftUnits(units: DraftUnitT[]): string {
  return units
    .map(
      (unit, i) =>
        `**Unit ${i + 1}: ${unitLabel(unit)}**\n${unitBullets(unit)}`,
    )
    .join("\n\n");
}

/**
 * Renders a definitions glossary as one `**term** — definition` line per
 * entry, or a placeholder when empty.
 */
export function renderDefinitions(definitions: DefinitionsT): string {
  const entries = Object.entries(definitions);
  if (entries.length === 0) return "_None provided._";
  return entries.map(([term, def]) => `**${term}** — ${def}`).join("\n");
}

/**
 * Renders a names-only source hierarchy proposal (Turn 1): one
 * `**N. Name** (Publisher)` line per source in rank order, with no attribute
 * bullets. The detailed per-attribute view is produced later by `renderSources`,
 * so the two stages stay format-consistent while living in one place.
 */
export function renderSourceProposal(
  sources: { rank: number; name: string; publisher: string }[],
): string {
  return [...sources]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => `**${s.rank}. ${s.name}** (${s.publisher})`)
    .join("\n");
}

/**
 * Renders resolution sources in rank order as one block per source:
 * a `**N. Name** (Publisher)` heading followed by its attribute bullets. When a
 * `reachability` map (URL → advisory link-check label) is supplied, a
 * `- Link check:` bullet is added under each source's URL.
 */
export function renderSources(
  sources: DataSourceT[],
  reachability?: ReadonlyMap<string, string>,
): string {
  return [...sources]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const linkCheck = reachability?.get(s.url);
      const bullets = [
        `- Establishes: ${s.controlsFor.join("; ")}`,
        `- Published: ${s.publicationSchedule}`,
        `- URL: ${s.url}${s.datasetId ? ` (dataset ${s.datasetId})` : ""}`,
        ...(linkCheck ? [`- Link check: ${linkCheck}`] : []),
        `- Publicly accessible: ${s.publiclyAccessible ? "yes" : "no"}`,
        `- Independence: ${s.independenceNote}`,
      ].join("\n");
      return `**${s.rank}. ${s.name}** (${s.publisher})\n${bullets}`;
    })
    .join("\n\n");
}
