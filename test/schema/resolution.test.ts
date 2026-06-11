import { describe, expect, test } from "bun:test";
import { ResolutionInfoSchema } from "../../src/schema/resolution";

const validResolutionInfo = {
  criteria: "Resolve Yes if the final certified attendance is at least 10,000.",
  primaryResolutionSource: {
    id: "venue-attendance-report",
    name: "Venue attendance report",
    owner: "Example Arena",
    type: "official_report",
    accessMethod: "web",
    document: {
      identifier: "Final Attendance Report",
      qualifiers: {
        year: "2026",
        section: "Final attendance",
        field: "Certified attendance",
      },
    },
    url: "https://example.com/final-attendance",
    notes: "Use the final published report, not preliminary estimates.",
  },
  fallbackResolutionSources: [
    {
      hierarchyRank: 1,
      id: "promoter-settlement-statement",
      name: "Promoter settlement statement",
      owner: "Example Promotions",
      type: "official_record",
      accessMethod: "private",
      document: {
        identifier: "Settlement Statement",
        qualifiers: {
          year: "2026",
          section: "Settlement summary",
        },
      },
      triggerCondition: "Primary venue attendance report is unavailable 48 hours after event end.",
      url: "https://example.com/settlement-statement",
      notes: "Use only if signed by the venue and promoter.",
    },
  ],
  primaryResolutionAuthority: {
    id: "market-operations-desk",
    name: "Market operations desk",
    type: "administrator",
    accessMethod: "private",
    notes: "Publishes final resolution notice.",
  },
  fallbackResolutionAuthorities: [
    {
      hierarchyRank: 1,
      id: "independent-event-auditor",
      name: "Independent event auditor",
      type: "auditor",
      accessMethod: "manual_request",
      notes: "Used when the operations desk declares a conflict.",
    },
  ],
};

describe("ResolutionInfoSchema", () => {
  test("accepts primary source and authority with ranked fallbacks", () => {
    const result = ResolutionInfoSchema.parse(validResolutionInfo);

    expect(result.primaryResolutionSource.name).toBe("Venue attendance report");
    expect(result.primaryResolutionSource.id).toBe("venue-attendance-report");
    expect(result.fallbackResolutionSources[0]?.hierarchyRank).toBe(1);
    expect(result.primaryResolutionAuthority.name).toBe("Market operations desk");
    expect(result.primaryResolutionAuthority.id).toBe("market-operations-desk");
    expect(result.fallbackResolutionAuthorities[0]?.hierarchyRank).toBe(1);
  });

  test("defaults fallback sources and authorities to empty arrays", () => {
    const result = ResolutionInfoSchema.parse({
      criteria: validResolutionInfo.criteria,
      primaryResolutionSource: validResolutionInfo.primaryResolutionSource,
      primaryResolutionAuthority: validResolutionInfo.primaryResolutionAuthority,
    });

    expect(result.fallbackResolutionSources).toEqual([]);
    expect(result.fallbackResolutionAuthorities).toEqual([]);
  });

  test("requires a trigger condition for fallback resolution sources", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      fallbackResolutionSources: [
        {
          hierarchyRank: 1,
          id: "promoter-settlement-statement",
          name: "Promoter settlement statement",
          owner: "Example Promotions",
          type: "official_record",
          accessMethod: "private",
          document: validResolutionInfo.fallbackResolutionSources[0]?.document,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("requires ids for resolution sources and authorities", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      primaryResolutionSource: {
        name: "Venue attendance report",
        owner: "Example Arena",
        type: "official_report",
        accessMethod: "web",
        document: validResolutionInfo.primaryResolutionSource.document,
      },
      primaryResolutionAuthority: {
        name: "Market operations desk",
        type: "administrator",
        accessMethod: "private",
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects non-positive fallback hierarchy ranks", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      fallbackResolutionAuthorities: [
        {
          hierarchyRank: 0,
          id: "independent-event-auditor",
          name: "Independent event auditor",
          type: "auditor",
          accessMethod: "manual_request",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown source types and access methods", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      primaryResolutionSource: {
        ...validResolutionInfo.primaryResolutionSource,
        type: "settlement-statement",
        accessMethod: "Published event settlement PDF",
      },
    });

    expect(result.success).toBe(false);
  });

  test("requires document references to include an identifier", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      primaryResolutionSource: {
        ...validResolutionInfo.primaryResolutionSource,
        document: {
          qualifiers: {
            year: "2026",
            section: "Final attendance",
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test("allows document references without source-specific qualifiers", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      primaryResolutionSource: {
        ...validResolutionInfo.primaryResolutionSource,
        document: {
          identifier: "Final Attendance Report",
        },
      },
    });

    expect(result.success).toBe(true);
  });

  test("rejects unknown authority types and access methods", () => {
    const result = ResolutionInfoSchema.safeParse({
      ...validResolutionInfo,
      primaryResolutionAuthority: {
        ...validResolutionInfo.primaryResolutionAuthority,
        type: "expert_analysis",
        accessMethod: "database",
      },
    });

    expect(result.success).toBe(false);
  });
});
