import { describe, expect, test } from "bun:test";
import { ResolutionInfoSchema } from "../../src/schema/resolution";

const validResolutionInfo = {
  criteria: "Resolve Yes if the final certified attendance is at least 10,000.",
  primaryResolutionSource: {
    id: "venue-attendance-report",
    name: "Venue attendance report",
    owner: "Example Arena",
    type: "official-report",
    accessMethod: "Published event settlement PDF",
    document: "Final Attendance Report",
    url: "https://example.com/final-attendance",
    notes: "Use the final published report, not preliminary estimates.",
  },
  fallbackResolutionSources: [
    {
      hierarchyRank: 1,
      id: "promoter-settlement-statement",
      name: "Promoter settlement statement",
      owner: "Example Promotions",
      type: "settlement-statement",
      accessMethod: "Promoter-provided document",
      document: "Settlement Statement",
      triggerCondition: "Primary venue attendance report is unavailable 48 hours after event end.",
      url: "https://example.com/settlement-statement",
      notes: "Use only if signed by the venue and promoter.",
    },
  ],
  primaryResolutionAuthority: {
    id: "market-operations-desk",
    name: "Market operations desk",
    type: "exchange",
    accessMethod: "Internal resolution workflow",
    notes: "Publishes final resolution notice.",
  },
  fallbackResolutionAuthorities: [
    {
      hierarchyRank: 1,
      id: "independent-event-auditor",
      name: "Independent event auditor",
      type: "third-party",
      accessMethod: "Written resolution memo",
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
          type: "settlement-statement",
          accessMethod: "Promoter-provided document",
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
        type: "official-report",
        accessMethod: "Published event settlement PDF",
      },
      primaryResolutionAuthority: {
        name: "Market operations desk",
        type: "exchange",
        accessMethod: "Internal resolution workflow",
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
          type: "third-party",
          accessMethod: "Written resolution memo",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
