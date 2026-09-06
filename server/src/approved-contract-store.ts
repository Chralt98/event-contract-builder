import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Definitions } from "../../src/schema/display-question";
import { DataSource } from "../../src/schema/resolution";
import { ConnectorDraftUnit } from "./connector-draft-unit";
import { alternativeMarketSchema } from "./source-alternative";

/** The identifier shared by all stages of one event-contract workflow. */
export const ContractId = z
  .uuid()
  .describe("Stable identifier for one event-contract workflow record.");

/** Optional on input so the first draft can create the identifier. */
export const optionalContractId = ContractId.optional().describe(
  "Stable event-contract identifier returned by the previous workflow step; pass it explicitly when the next HTTP call may use a new MCP session, and omit when starting a new contract.",
);

const draftedQuestionsRecord = z.object({
  units: z.array(ConnectorDraftUnit),
  followUp: z.string(),
});

const selectedUnitRecord = z.object({
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
});

const definedTermsRecord = z.object({
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  definitions: Definitions,
  followUp: z.string(),
});

const sourceIdentity = z.object({
  rank: z.number().int().min(1),
  name: z.string().min(3),
  publisher: z.string().min(2),
  url: z.url(),
});

const sourceProposalRecord = z.object({
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  sources: z.array(sourceIdentity).min(1),
  coverage_gaps: z.array(z.string().min(3)).min(1).max(12).optional(),
  alternative_market: alternativeMarketSchema.optional(),
  followUp: z.string(),
});

const resolutionSourcesRecord = z.object({
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  sources: z.array(DataSource).min(1),
  coverage_gaps: z.array(z.string().min(3)).min(1).max(12).optional(),
  alternative_market: alternativeMarketSchema.optional(),
  followUp: z.string(),
});

export const approvalStageSchema = z.enum([
  "selected_unit",
  "defined_terms",
  "proposed_resolution_sources",
  "resolution_sources",
]);

export type ApprovalStage = z.infer<typeof approvalStageSchema>;

const approvedStagesSchema = z.array(approvalStageSchema).default([]);

/** Complete internal record retained for workflow handoff and retries. */
export const approvedContractSchema = z.object({
  contract_id: ContractId,
  drafted_questions: draftedQuestionsRecord.optional(),
  selected_unit: selectedUnitRecord.optional(),
  defined_terms: definedTermsRecord.optional(),
  proposed_resolution_sources: sourceProposalRecord.optional(),
  resolution_sources: resolutionSourcesRecord.optional(),
  approved_stages: approvedStagesSchema,
});

export type ApprovedContractRecord = z.infer<typeof approvedContractSchema>;

/** Public retrieval shape containing only the approved contract content. */
export const approvedContractRecallSchema = z.object({
  contract_id: ContractId,
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  definitions: Definitions.optional(),
  proposed_resolution_sources: z
    .object({ sources: z.array(sourceIdentity).min(1) })
    .optional(),
  resolution_sources: z
    .object({ sources: z.array(DataSource).min(1) })
    .optional(),
});

export type ApprovedContractRecall = z.infer<
  typeof approvedContractRecallSchema
>;

export type ApprovedContractStage =
  | "drafted_questions"
  | "selected_unit"
  | "defined_terms"
  | "proposed_resolution_sources"
  | "resolution_sources";

/**
 * Process-lifetime handoff records shared by HTTP session stores. The store is
 * intentionally addressable only by an explicit contract ID; it has no
 * implicit "latest" lookup and is not a durable or authenticated database.
 */
export class ApprovedContractHandoffStore {
  private readonly records = new Map<string, ApprovedContractRecord>();

  get(contractId: string): ApprovedContractRecord | undefined {
    const record = this.records.get(contractId);
    return record ? structuredClone(record) : undefined;
  }

  save(record: ApprovedContractRecord): void {
    this.records.set(record.contract_id, structuredClone(record));
  }
}

type ContractIdentity = {
  unitNumber?: number;
  selectedUnit?: unknown;
};

/**
 * In-memory workflow memory. A store belongs to one MCP server/session, while
 * an optional handoff store makes explicitly identified records available to
 * other HTTP sessions. Both are intentionally lost when the hosting process
 * ends.
 */
export class ApprovedContractStore {
  private readonly records = new Map<string, ApprovedContractRecord>();
  private readonly recency: string[] = [];

  constructor(private readonly handoffStore?: ApprovedContractHandoffStore) {}

  /**
   * Return an existing contract ID when the selected unit identifies one, or
   * create a new ID for a new workflow. Explicit IDs always win.
   */
  resolveContractId(
    explicitId: string | undefined,
    identity: ContractIdentity = {},
  ): string {
    if (explicitId) return explicitId;

    for (const contractId of [...this.recency].reverse()) {
      const record = this.records.get(contractId);
      if (record && recordContainsUnit(record, identity)) {
        return contractId;
      }
    }

    return randomUUID();
  }

  /** Save one validated stage, replacing a retry of that stage. */
  save(
    stage: ApprovedContractStage,
    payload: Record<string, unknown>,
  ): ApprovedContractRecord {
    const contractId = payload["contract_id"];
    if (typeof contractId !== "string") {
      throw new Error(
        "A contract_id is required before saving a workflow stage.",
      );
    }

    const { contract_id: _ignoredContractId, ...stagePayload } = payload;
    // An explicit ID may arrive from another HTTP session. Prefer the shared
    // handoff snapshot so a stale local record cannot overwrite newer stages.
    const current =
      this.handoffStore?.get(contractId) ?? this.records.get(contractId);
    const next: Record<string, unknown> = {
      ...(current ?? { contract_id: contractId }),
      [stage]: stagePayload,
      approved_stages: (current?.approved_stages ?? []).filter(
        (approvedStage) =>
          !approvalStagesInvalidatedBy(stage).has(approvedStage),
      ),
    };
    assertStageMatchesSelectedUnit(current, stage, stagePayload);

    // A changed upstream approval invalidates the downstream snapshots that
    // were derived from it. This also keeps retries idempotent and coherent.
    for (const downstreamStage of downstreamStages(stage)) {
      delete next[downstreamStage];
    }

    const record = approvedContractSchema.parse(next);
    this.persist(record);
    return structuredClone(record);
  }

  /**
   * Record an explicit user approval for a pending workflow stage. Submission
   * tools only create pending handoff snapshots; this is the sole promotion
   * path into approved contract memory.
   */
  approve(
    stage: ApprovalStage,
    explicitContractId?: string,
  ): ApprovedContractRecord {
    const current = this.get(explicitContractId);
    if (!current) {
      throw new Error(
        explicitContractId
          ? `No event-contract record was found for contract_id ${explicitContractId}.`
          : "No event-contract record is available to approve in this chat.",
      );
    }
    if (!current[stage]) {
      throw new Error(
        `Cannot approve ${stage}: that workflow stage has not been submitted.`,
      );
    }
    assertStageMatchesSelectedUnit(current, stage, current[stage]);

    const requiredStage = requiredApprovalStage(stage);
    if (requiredStage && !current.approved_stages.includes(requiredStage)) {
      throw new Error(
        `Cannot approve ${stage}: ${requiredStage} must be approved first.`,
      );
    }

    const record = approvedContractSchema.parse({
      ...current,
      approved_stages: current.approved_stages.includes(stage)
        ? current.approved_stages
        : [...current.approved_stages, stage],
    });
    this.persist(record);
    return structuredClone(record);
  }

  /** Retrieve a selected record, or the most recently updated one. */
  get(contractId?: string): ApprovedContractRecord | undefined {
    if (contractId) {
      // Explicit IDs are the opt-in bearer handoff across HTTP sessions.
      return (
        this.handoffStore?.get(contractId) ??
        (() => {
          const record = this.records.get(contractId);
          return record ? structuredClone(record) : undefined;
        })()
      );
    }

    // Implicit lookup intentionally remains session-local. Never fall back to
    // the process-wide handoff store without an explicit bearer ID.
    const id = [...this.recency].reverse().find((candidateId) => {
      const candidate = this.records.get(candidateId);
      return candidate !== undefined && hasSelectedUnit(candidate);
    });
    if (!id) return undefined;
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }

  private persist(record: ApprovedContractRecord): void {
    this.records.set(record.contract_id, structuredClone(record));
    this.handoffStore?.save(record);
    const existingIndex = this.recency.indexOf(record.contract_id);
    if (existingIndex >= 0) this.recency.splice(existingIndex, 1);
    this.recency.push(record.contract_id);
  }
}

/**
 * Project the internal workflow record into the approved information exposed
 * by the retrieval tool. A draft-only record has no selected unit yet and is
 * therefore not recallable.
 */
export function projectApprovedContract(
  record: ApprovedContractRecord,
): ApprovedContractRecall | undefined {
  const definedTerms = record.approved_stages.includes("defined_terms")
    ? record.defined_terms
    : undefined;
  const proposedResolutionSources = record.approved_stages.includes(
    "proposed_resolution_sources",
  )
    ? record.proposed_resolution_sources
    : undefined;
  const resolutionSources = record.approved_stages.includes(
    "resolution_sources",
  )
    ? record.resolution_sources
    : undefined;
  const selectedUnit = record.approved_stages.includes("selected_unit")
    ? record.selected_unit
    : undefined;
  const selectedStage =
    resolutionSources ??
    proposedResolutionSources ??
    definedTerms ??
    selectedUnit;
  if (!selectedStage) return undefined;

  return approvedContractRecallSchema.parse({
    contract_id: record.contract_id,
    unit_number: selectedStage.unit_number,
    selected_unit: selectedStage.selected_unit,
    ...(definedTerms ? { definitions: definedTerms.definitions } : {}),
    ...(proposedResolutionSources
      ? {
          proposed_resolution_sources: {
            sources: proposedResolutionSources.sources,
          },
        }
      : {}),
    ...(resolutionSources
      ? {
          resolution_sources: {
            sources: resolutionSources.sources,
          },
        }
      : {}),
  });
}

function hasSelectedUnit(record: ApprovedContractRecord): boolean {
  return Boolean(
    record.selected_unit ??
    record.defined_terms ??
    record.proposed_resolution_sources ??
    record.resolution_sources,
  );
}

function downstreamStages(
  stage: ApprovedContractStage,
): ApprovedContractStage[] {
  switch (stage) {
    case "drafted_questions":
      return [
        "selected_unit",
        "defined_terms",
        "proposed_resolution_sources",
        "resolution_sources",
      ];
    case "selected_unit":
      return [
        "defined_terms",
        "proposed_resolution_sources",
        "resolution_sources",
      ];
    case "defined_terms":
      return ["proposed_resolution_sources", "resolution_sources"];
    case "proposed_resolution_sources":
      return ["resolution_sources"];
    case "resolution_sources":
      return [];
  }
}

function approvalStagesInvalidatedBy(
  stage: ApprovedContractStage,
): Set<ApprovalStage> {
  const stages =
    stage === "drafted_questions"
      ? [
          "selected_unit",
          "defined_terms",
          "proposed_resolution_sources",
          "resolution_sources",
        ]
      : [stage, ...downstreamStages(stage)];
  return new Set(
    stages.filter(
      (candidate): candidate is ApprovalStage =>
        approvalStageSchema.safeParse(candidate).success,
    ),
  );
}

function requiredApprovalStage(
  stage: ApprovalStage,
): ApprovalStage | undefined {
  switch (stage) {
    case "selected_unit":
      return undefined;
    case "defined_terms":
      return "selected_unit";
    case "proposed_resolution_sources":
      return "defined_terms";
    case "resolution_sources":
      return "proposed_resolution_sources";
  }
}

function assertStageMatchesSelectedUnit(
  current: ApprovedContractRecord | undefined,
  stage: ApprovedContractStage,
  payload: unknown,
): void {
  if (
    !current?.selected_unit ||
    stage === "drafted_questions" ||
    stage === "selected_unit"
  ) {
    return;
  }

  if (!isRecord(payload)) return;
  const unitNumber = payload["unit_number"];
  const selectedUnit = payload["selected_unit"];
  if (
    unitNumber !== current.selected_unit.unit_number ||
    !valuesEqual(selectedUnit, current.selected_unit.selected_unit)
  ) {
    throw new Error(
      `Cannot save or approve ${stage}: it does not match the selected unit.`,
    );
  }
}

function recordContainsUnit(
  record: ApprovedContractRecord,
  identity: ContractIdentity,
): boolean {
  if (identity.selectedUnit === undefined) return false;

  const candidates: unknown[] = [
    record.selected_unit?.selected_unit,
    record.defined_terms?.selected_unit,
    record.proposed_resolution_sources?.selected_unit,
    record.resolution_sources?.selected_unit,
  ];

  const unitNumber = identity.unitNumber;
  if (unitNumber !== undefined && unitNumber >= 1) {
    candidates.push(record.drafted_questions?.units[unitNumber - 1]);
  } else {
    candidates.push(...(record.drafted_questions?.units ?? []));
  }

  return candidates.some((candidate) =>
    valuesEqual(candidate, identity.selectedUnit),
  );
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => key in right && valuesEqual(left[key], right[key]),
      )
    );
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
