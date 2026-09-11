import type { z } from "zod";
import type {
  DraftUnitT,
  DefinitionsT,
} from "../../src/schema/display-question";
import type { DataSource } from "../../src/schema/resolution";
import type { ApprovedContractRecall } from "./approved-contract-store";
import { parseConnectorDraftUnit } from "./connector-draft-unit";
import type { AlternativeMarketT } from "./source-alternative";
import { type ParsedTimingPayloadT, type TimingDataT } from "./timing";

type DataSourceT = z.infer<typeof DataSource>;

/** Human label for a draft unit's market type. */
function unitLabel(unit: DraftUnitT): string {
  return unit.type === "binary"
    ? "Binary market"
    : unit.type === "scalar"
      ? "Scalar market"
      : unit.type === "categorical"
        ? "Categorical market"
        : "Template market";
}

/** A unit's question(s) rendered as `- ` bullets, one per line. */
function unitBullets(unit: DraftUnitT): string {
  if (unit.type === "template") {
    return [
      `- ${unit.question}`,
      ...unit.variables.flatMap(({ name, values }) => [
        `  - \`<${name}>\`:`,
        ...values.map((value) => `    - ${value}`),
      ]),
    ].join("\n");
  }

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
 * Renders a definitions glossary as one Markdown bullet per entry, or a
 * placeholder when empty. Bullets keep every term and definition visible when
 * the host reflows the tool's text content.
 */
export function renderDefinitions(definitions: DefinitionsT): string {
  const entries = Object.entries(definitions);
  if (entries.length === 0) return "_None provided._";
  return entries.map(([term, def]) => `- **${term}** — ${def}`).join("\n");
}

/**
 * Renders explicit source-coverage gaps and, when supplied, a newly drafted
 * nearby/proxy display-question unit with at least two independent source
 * identities.
 */
export function renderSourceCoverageAdvice(
  coverageGaps: string[] | undefined,
  alternativeMarket: AlternativeMarketT | undefined,
): string | undefined {
  const parts: string[] = [];

  if (coverageGaps?.length) {
    parts.push(
      "### Source Coverage Warning\n" +
        "⚠ No authoritative primary source was found for: " +
        coverageGaps.join("; ") +
        ". The selected market is not fully source-covered as written. " +
        "Alternative required: propose a nearby or proxy market with at least " +
        "two independent resolution sources before locking it.",
    );
  }

  if (alternativeMarket) {
    const alternativeUnit = parseConnectorDraftUnit(
      alternativeMarket.display_question_unit,
    );
    parts.push(
      "### Nearby Alternative Display Question\n" +
        renderAlternativeUnitHeader(
          alternativeUnit,
          alternativeMarket.unit_number,
        ) +
        "\n" +
        `- Rationale: ${alternativeMarket.rationale}\n` +
        `- If selected: treat this display-question proposal as Unit ${alternativeMarket.unit_number}, then continue with define-timing and define-terms from scratch; re-check these source candidates after the new timing and definitions are agreed.\n` +
        "- Independent resolution sources:\n" +
        alternativeMarket.sources
          .map(
            (source) =>
              `  - **${source.name}** (${source.publisher}) — ` +
              `[${source.url}](${source.url})`,
          )
          .join("\n"),
    );
  }

  return parts.length ? parts.join("\n\n") : undefined;
}

/** Renders an alternative unit without confusing it with the current unit. */
export function renderAlternativeUnitHeader(
  unit: DraftUnitT,
  unitNumber: number,
): string {
  return `**Alternative Unit ${unitNumber}: ${unitLabel(unit)}**\n${unitBullets(unit)}`;
}

/**
 * Renders resolution sources in rank order as one block per source:
 * a `**N. Name** (Publisher)` heading followed by its user-facing attribute
 * bullets.
 */
export function renderSources(sources: DataSourceT[]): string {
  return [...sources]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const bullets = [
        `- URL: ${s.url}${s.datasetId ? ` (dataset ${s.datasetId})` : ""}`,
        `- Establishes: ${s.controlsFor.join("; ")}`,
        `- Publishing Schedule: ${s.publicationSchedule}`,
        `- Independence: ${s.independenceNote}`,
      ].join("\n");
      return `**${s.rank}. ${s.name}** (${s.publisher})\n${bullets}`;
    })
    .join("\n\n");
}

function formatLocalTimestamp(timestamp: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  ) as Record<string, string>;
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function timelineEntry(
  timestamp: string,
  timeZone: string,
  label: string,
): string {
  return [
    `${formatLocalTimestamp(timestamp, timeZone)} ${timeZone}`,
    `UTC: ${timestamp}`,
    label,
  ].join("\n");
}

function renderTimingTimeline(timing: TimingDataT): string {
  const entries = [
    timelineEntry(
      timing.trading.start,
      timing.trading.time_zone,
      "Trading opens",
    ),
    timelineEntry(
      timing.trading.end,
      timing.trading.time_zone,
      "Trading closes",
    ),
  ];

  if (timing.timing_type === "point_in_time") {
    entries.push(
      timelineEntry(timing.event_deadline!, timing.time_zone, "Event deadline"),
    );
  } else {
    entries.push(
      timelineEntry(
        timing.observation_start!,
        timing.time_zone,
        "Observation starts",
      ),
      timelineEntry(
        timing.observation_end!,
        timing.time_zone,
        "Observation ends",
      ),
    );
  }

  entries.push(
    timelineEntry(
      timing.expiration.datetime,
      timing.expiration.time_zone,
      "Contract expires",
    ),
  );

  return ["```text", entries.join("\n        │\n"), "```"].join("\n");
}

function renderTimingKeyRules(timing: TimingDataT): string {
  const observationWindow =
    timing.timing_type === "point_in_time"
      ? "N/A"
      : `${timing.observation_start} → ${timing.observation_end}`;
  const boundary =
    timing.timing_type === "point_in_time"
      ? timing.boundary.end
      : `start ${timing.boundary.start}, end ${timing.boundary.end}`;
  const eventType =
    timing.timing_type === "point_in_time"
      ? "Point-in-time event"
      : "Measurement";

  return [
    "**Key rules**",
    "",
    "| Item | Proposed value |",
    "|---|---|",
    `| Event type | ${eventType} |`,
    `| Observation window | ${observationWindow} |`,
    `| Boundary | ${boundary} |`,
    `| Evidence rule | ${timing.evidence_rule} |`,
    `| Time zone | ${timing.time_zone} |`,
  ].join("\n");
}

/** Renders the complete timing body in the recommended proposal shape. */
function renderTimingBody(
  timing: TimingDataT,
  heading = "**Timing proposal**",
): string {
  return [
    heading,
    renderTimingTimeline(timing),
    renderTimingKeyRules(timing),
  ].join("\n\n");
}

/** Renders the final timing submission in the recommended proposal shape. */
export function renderTimingSubmission(
  timing: ParsedTimingPayloadT,
  unit: DraftUnitT,
  unitNumber: number,
): string {
  return [
    renderUnitHeader(unit, unitNumber),
    "---",
    renderTimingBody(timing),
    "---",
    timing.followUp,
  ].join("\n\n");
}

/**
 * Renders only the approved contract content. The initial candidate draft,
 * workflow follow-ups, and unselected source alternatives are intentionally
 * excluded from recall.
 */
export function renderApprovedContract(
  contract: ApprovedContractRecall,
): string {
  const parts = [
    `**Approved Event Contract**\n- Contract ID: ${contract.contract_id}`,
    "### Selected Unit",
    renderUnitHeader(
      parseConnectorDraftUnit(contract.selected_unit),
      contract.unit_number,
    ),
  ];

  if (contract.timing) {
    parts.push("### Approved Timing", renderTimingBody(contract.timing));
  }

  if (contract.definitions) {
    parts.push(
      "### Approved Definitions",
      renderDefinitions(contract.definitions),
    );
  }

  if (contract.resolution_sources) {
    parts.push(
      "### Resolution Sources",
      renderSources(contract.resolution_sources.sources),
    );
  }

  return parts.join("\n\n");
}
