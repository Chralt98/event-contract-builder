import { z } from "zod";

const NonEmptyStringSchema = z.string().min(1);

const HierarchyRankSchema = z
  .int()
  .positive()
  .describe(
    "Positive rank in the fallback hierarchy; lower numbers are used first.",
  );

const ResolutionSourceTypeSchema = z
  .enum([
    "official_report",
    "official_record",
    "news_report",
    "expert_analysis",
    "crowdsourced_report",
    "dataset",
    "database_query",
    "public_archive",
    "legal_record",
    "company_filing",
    "technical_record",
    "other",
  ])
  .describe("Type or category of the resolution source.");

const ResolutionAccessMethodSchema = z
  .enum([
    "web",
    "api",
    "subscription",
    "private",
    "database",
    "download",
    "public_archive",
    "manual_request",
    "other",
  ])
  .describe("How the resolution source can be accessed.");

export const ResolutionDocumentReferenceSchema = z
  .object({
    identifier: NonEmptyStringSchema.describe(
      "Constrained identifier, title, code, or locator for the referenced document.",
    ),
    qualifiers: z
      .record(z.string().min(1), NonEmptyStringSchema)
      .optional()
      .describe(
        "Optional named qualifiers such as edition, year, table, row, column, section, page, or version.",
      ),
  })
  .describe(
    "Semi-structured reference to a document or document location used for resolution.",
  );

const ResolutionAuthorityTypeSchema = z
  .enum([
    "administrator",
    "resolver",
    "expert_committee",
    "arbiter",
    "algorithm",
    "oracle_provider",
    "data_steward",
    "auditor",
    "court",
    "regulator",
    "mutually_agreed_expert",
    "other",
  ])
  .describe("Type or category of the resolution authority.");

const ResolutionAuthorityAccessMethodSchema = z
  .enum([
    "web",
    "api",
    "subscription",
    "private",
    "private_report",
    "specification",
    "manual_request",
    "public_record",
    "other",
  ])
  .describe("How the resolution authority can be accessed.");

const ResolutionSourceFields = {
  id: NonEmptyStringSchema.describe(
    "Stable identifier for the resolution source.",
  ),
  name: NonEmptyStringSchema.describe(
    "Name of the source used to resolve the event contract.",
  ),
  type: ResolutionSourceTypeSchema,
  accessMethod: ResolutionAccessMethodSchema,
  owner: NonEmptyStringSchema.optional().describe(
    "Owner or publisher responsible for the resolution source.",
  ),
  document: ResolutionDocumentReferenceSchema,
  url: z.url().optional().describe("Optional URL for the resolution source."),
  notes: NonEmptyStringSchema.optional().describe(
    "Additional notes about the resolution source.",
  ),
};

const ResolutionAuthorityFields = {
  id: NonEmptyStringSchema.describe(
    "Stable identifier for the resolution authority.",
  ),
  name: NonEmptyStringSchema.describe(
    "Name of the authority responsible for resolution.",
  ),
  type: ResolutionAuthorityTypeSchema,
  accessMethod: ResolutionAuthorityAccessMethodSchema,
  notes: NonEmptyStringSchema.optional().describe(
    "Additional notes about the resolution authority.",
  ),
};

export const PrimaryResolutionSourceSchema = z.object(ResolutionSourceFields);

export const FallbackResolutionSourceSchema = z.object({
  hierarchyRank: HierarchyRankSchema,
  ...ResolutionSourceFields,
  triggerCondition: NonEmptyStringSchema.describe(
    "Condition that activates this fallback resolution source.",
  ),
});

export const PrimaryResolutionAuthoritySchema = z.object(
  ResolutionAuthorityFields,
);

export const FallbackResolutionAuthoritySchema = z.object({
  hierarchyRank: HierarchyRankSchema,
  ...ResolutionAuthorityFields,
});

export const ResolutionInfoSchema = z.object({
  criteria: NonEmptyStringSchema.describe(
    "Objective criteria used to determine the final outcome.",
  ),
  primaryResolutionSource: PrimaryResolutionSourceSchema.describe(
    "Primary source used to verify and resolve the event contract.",
  ),
  fallbackResolutionSources: z
    .array(FallbackResolutionSourceSchema)
    .default([])
    .describe(
      "Ranked fallback sources used if the primary source is unavailable or insufficient.",
    ),
  primaryResolutionAuthority: PrimaryResolutionAuthoritySchema.describe(
    "Primary authority responsible for resolving the event contract.",
  ),
  fallbackResolutionAuthorities: z
    .array(FallbackResolutionAuthoritySchema)
    .default([])
    .describe(
      "Ranked fallback authorities used if the primary authority cannot resolve the contract.",
    ),
});
