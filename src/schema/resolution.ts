import { z } from "zod";

const NonEmptyStringSchema = z.string().min(1);

const HierarchyRankSchema = z
  .int()
  .positive()
  .describe(
    "Positive rank in the fallback hierarchy; lower numbers are used first.",
  );

const ResolutionSourceFields = {
  id: NonEmptyStringSchema.describe("Stable identifier for the resolution source."),
  name: NonEmptyStringSchema.describe(
    "Name of the source used to resolve the event contract.",
  ),
  type: NonEmptyStringSchema.describe(
    "Type or category of the resolution source.",
  ),
  accessMethod: NonEmptyStringSchema.describe(
    "How the resolution source can be accessed.",
  ),
  owner: NonEmptyStringSchema.optional().describe(
    "Owner or publisher responsible for the resolution source.",
  ),
  document: NonEmptyStringSchema.optional().describe(
    "Document identifier or title for the resolution source.",
  ),
  url: z.url().optional().describe("Optional URL for the resolution source."),
  notes: NonEmptyStringSchema.optional().describe(
    "Additional notes about the resolution source.",
  ),
};

const ResolutionAuthorityFields = {
  id: NonEmptyStringSchema.describe("Stable identifier for the resolution authority."),
  name: NonEmptyStringSchema.describe(
    "Name of the authority responsible for resolution.",
  ),
  type: NonEmptyStringSchema.describe(
    "Type or category of the resolution authority.",
  ),
  accessMethod: NonEmptyStringSchema.describe(
    "How the resolution authority can be accessed.",
  ),
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
