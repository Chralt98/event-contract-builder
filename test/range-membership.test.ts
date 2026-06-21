import { describe, expect, test } from "bun:test";
import {
  parseInterval,
  RangeDefinition,
} from "../src/schema/criterion-range-membership";
import { Criterion } from "../src/schema/resolution";
import { expandRangeContracts } from "../src/lib/expand-range-contracts";
import { type EventContractSpecT } from "../src/schema/event-contract";
import { renderProductName } from "../src/cnl-product-name";

/* -------------------------------------------------------------------------- */
/* parseInterval                                                              */
/* -------------------------------------------------------------------------- */

describe("parseInterval", () => {
  test("parses (-inf, 40.0)", () => {
    const iv = parseInterval("(-inf, 40.0)");
    expect(iv).toEqual({
      lowerBound: null,
      lowerInclusive: false,
      upperBound: 40,
      upperInclusive: false,
    });
  });

  test("parses [40.0, 45.0)", () => {
    const iv = parseInterval("[40.0, 45.0)");
    expect(iv).toEqual({
      lowerBound: 40,
      lowerInclusive: true,
      upperBound: 45,
      upperInclusive: false,
    });
  });

  test("parses [50.0, +inf)", () => {
    const iv = parseInterval("[50.0, +inf)");
    expect(iv).toEqual({
      lowerBound: 50,
      lowerInclusive: true,
      upperBound: null,
      upperInclusive: false,
    });
  });

  test("parses (2, 3]", () => {
    const iv = parseInterval("(2, 3]");
    expect(iv).toEqual({
      lowerBound: 2,
      lowerInclusive: false,
      upperBound: 3,
      upperInclusive: true,
    });
  });

  test("parses negative numbers (-inf, -5.0)", () => {
    const iv = parseInterval("(-inf, -5.0)");
    expect(iv).toEqual({
      lowerBound: null,
      lowerInclusive: false,
      upperBound: -5,
      upperInclusive: false,
    });
  });

  test("rejects [-inf, 40) — -inf must be exclusive", () => {
    expect(parseInterval("[-inf, 40)")).toBeNull();
  });

  test("rejects [50, +inf] — +inf must be exclusive", () => {
    expect(parseInterval("[50, +inf]")).toBeNull();
  });

  test("rejects [50, 40) — lower >= upper", () => {
    expect(parseInterval("[50, 40)")).toBeNull();
  });

  test("rejects [40, 40) — lower == upper", () => {
    expect(parseInterval("[40, 40)")).toBeNull();
  });

  test("rejects garbage", () => {
    expect(parseInterval("not an interval")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* RangeDefinition                                                            */
/* -------------------------------------------------------------------------- */

describe("RangeDefinition", () => {
  test("accepts a valid range definition", () => {
    const result = RangeDefinition.safeParse({
      id: "lt-40",
      label: "Below 40",
      interval: "(-inf, 40.0)",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid interval format", () => {
    const result = RangeDefinition.safeParse({
      id: "bad",
      label: "Bad",
      interval: "40 to 50",
    });
    expect(result.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Criterion contiguity validation                                            */
/* -------------------------------------------------------------------------- */

const validMetric = {
  name: "US CPI year-over-year rate",
  unit: "percent",
  extraction:
    "Read the annual percent change from the CPI-U all-items series in the BLS CPI Summary table.",
  revisionPolicy: "first-published-value" as const,
  precision: 1,
};

function makeRangeCriterion(
  ranges: Array<{ id: string; label: string; interval: string }>,
) {
  return {
    kind: "range-membership" as const,
    metric: validMetric,
    ranges,
  };
}

const validLadder = [
  { id: "lt-40", label: "Below 40", interval: "(-inf, 40.0)" },
  { id: "40-to-45", label: "40 to 45", interval: "[40.0, 45.0)" },
  { id: "45-to-50", label: "45 to 50", interval: "[45.0, 50.0)" },
  { id: "gte-50", label: "50 and above", interval: "[50.0, +inf)" },
];

describe("RangeMembershipCriterion contiguity", () => {
  test("accepts a valid contiguous ladder", () => {
    const result = Criterion.safeParse(makeRangeCriterion(validLadder));
    expect(result.success).toBe(true);
  });

  test("rejects fewer than 2 ranges", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "all", label: "All", interval: "(-inf, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
  });

  test("rejects when first range does not start at -inf", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "a", label: "A", interval: "[0, 50.0)" },
        { id: "b", label: "B", interval: "[50.0, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("start at -inf");
    }
  });

  test("rejects when last range does not end at +inf", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "a", label: "A", interval: "(-inf, 50.0)" },
        { id: "b", label: "B", interval: "[50.0, 100)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("end at +inf");
    }
  });

  test("rejects gap between adjacent ranges", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "a", label: "A", interval: "(-inf, 40.0)" },
        { id: "b", label: "B", interval: "(40.0, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("gap");
    }
  });

  test("rejects overlap between adjacent ranges", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "a", label: "A", interval: "(-inf, 40.0]" },
        { id: "b", label: "B", interval: "[40.0, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("overlap");
    }
  });

  test("rejects boundary mismatch between adjacent ranges", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "a", label: "A", interval: "(-inf, 40.0)" },
        { id: "b", label: "B", interval: "[41.0, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("Boundary mismatch");
    }
  });

  test("rejects duplicate range ids", () => {
    const result = Criterion.safeParse(
      makeRangeCriterion([
        { id: "dup", label: "A", interval: "(-inf, 40.0)" },
        { id: "dup", label: "B", interval: "[40.0, +inf)" },
      ]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("Duplicate range id");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* expandRangeContracts                                                       */
/* -------------------------------------------------------------------------- */

function makeRangeSpec(): EventContractSpecT {
  const productNameStructure = {
    template: "numeric-threshold" as const,
    metric: "CPI YoY",
    comparator: "at-least" as const,
    value: 3,
    unit: "percent",
  };

  return {
    dsl: "event-contract-cnl/0.1",
    meta: {
      ticker: "CPI-26JUN-T3.0",
      seriesCode: "CPI-YOY",
      productName: {
        structure: productNameStructure,
        displayName: renderProductName(productNameStructure),
      },
      title: "CPI Year-over-Year Rate (June 2026)",
      shortTitle: "CPI YoY",
      contractType: "Event Contract" as const,
      instrumentType: "Swap (Binary Option)" as const,
      instrumentCategory: "Event" as const,
      instrumentSubcategory: "Binary Option" as const,
      category: "economic-indicator" as const,
      tags: ["cpi", "inflation"],
      specVersion: "1.0.0",
      status: "draft" as const,
      lastUpdated: "2026-06-18",
      authors: ["Product Team"],
    },
    underlying: {
      eventDefinition:
        "The U.S. Consumer Price Index for All Urban Consumers year-over-year percent change for the reference month of June 2026.",
      commodityClassification: {
        hypothesis: "excluded-commodity" as const,
        rationale:
          "CPI is an occurrence beyond the parties' control with clear economic consequence, fitting CEA section 1a(19)(iv) excluded-commodity definition.",
      },
      underlyingMarketDescription:
        "The Consumer Price Index (CPI) is published monthly by the U.S. Bureau of Labor Statistics. It measures the average change over time in the prices paid by urban consumers for a market basket of consumer goods and services. The CPI is widely followed by financial markets, policymakers, and the public as the primary gauge of consumer inflation in the United States.",
      enumeratedActivityScreen: {
        activities: {
          unlawfulUnderFederalOrStateLaw: {
            settlementDeterminedByActivity: false,
            note: "",
          },
          terrorism: { settlementDeterminedByActivity: false, note: "" },
          assassination: { settlementDeterminedByActivity: false, note: "" },
          war: { settlementDeterminedByActivity: false, note: "" },
          gaming: { settlementDeterminedByActivity: false, note: "" },
          commissionDesignatedSimilarActivity: {
            settlementDeterminedByActivity: false,
            note: "",
          },
        },
        settlementOccurrenceAnalysis:
          "Settlement is determined by the value of a government-published economic indicator, which is a lawful measurement activity.",
        anyEnumeratedActivityInvolved: false,
      },
    },
    outcome: {
      type: "binary" as const,
      values: ["Yes", "No"] as ["Yes", "No"],
      yesDefinition:
        "The resolution criterion holds as stated in the canonical statement.",
      noDefinition:
        "The resolution criterion does not hold as stated in the canonical statement.",
    },
    trading: {
      quotation: "cents-0-100" as const,
      minTickSize: 1,
      tradingHours: "08:00-22:00 America/New_York, Mon-Fri",
      listingCycle:
        "Single listing cycle for the June 2026 CPI year-over-year outcome.",
      firstTradingTime: "2026-06-01T08:00:00-04:00",
      lastTradingTime: "2027-01-15T16:00:00-05:00",
      expirationTime: "2027-01-15T16:00:00-05:00",
      tradingTimezone: "America/New_York",
      expirationValue:
        "The Expiration Value is the CPI year-over-year rate as documented by the U.S. Bureau of Labor Statistics on the Expiration Date at the Expiration Time.",
      positionLimits: { mode: "position-limit" as const, contracts: 25000 },
      settlementTiming:
        "Settlement occurs within two business days after final resolution is confirmed and the dispute window has closed.",
      priceQuoteMinimum: 0,
      priceQuoteMaximum: 100,
      priceQuoteConvention:
        "Price quoted in cents per USD 1.00 contract. Range: 0 to 100 cents.",
      expirationDate: "2027-01-15",
      expirationTimeLiteral:
        "The Expiration Time of the Contract shall be 4 PM UTC-05:00.",
    },
    resolution: {
      criterion: makeRangeCriterion(validLadder),
      canonicalStatement:
        "Range membership criterion placeholder that must be expanded before rendering or trading.",
      observationWindow: {
        start: "2026-01-01T00:00:00Z",
        end: "2026-12-31T23:59:59Z",
        timezone: "UTC",
      },
      sources: [
        {
          id: "bls-cpi",
          name: "Consumer Price Index",
          publisher: "U.S. Bureau of Labor Statistics",
          url: "https://www.bls.gov/cpi/",
          datasetId: "CUSR0000SA0",
          publicationSchedule:
            "Published monthly by the BLS, typically around the 10th-14th of the following month.",
          publiclyAccessible: true,
          independenceNote:
            "The BLS is a principal federal statistical agency; its data production is independent of market participants.",
        },
      ],
      primarySourceId: "bls-cpi",
      fallbacks: [],
      scheduledResolutionTime: "2027-01-15T12:00:00Z",
      resolutionDeadline: "2027-01-31T23:59:59Z",
      maximumResolutionDelayHours:
        (new Date("2027-01-31T23:59:59Z").getTime() -
          new Date("2027-01-15T12:00:00Z").getTime()) /
        (1000 * 60 * 60),
      earlyResolution: { allowed: false as const },
      terminalAmbiguityPolicy: "void-and-refund" as const,
      edgeCases: [
        {
          scenario:
            "If the BLS retracts the first published value before the resolution deadline.",
          disposition:
            "Use the corrected value published before the resolution deadline.",
        },
        {
          scenario:
            "If no CPI value is published before the extended resolution deadline.",
          disposition:
            "Apply the terminal ambiguity policy and void the contract.",
        },
        {
          scenario:
            "If the BLS renames the CPI series without changing methodology.",
          disposition:
            "Use the renamed successor series as the primary data source.",
        },
      ],
      disputeWindowHours: 24,
    },
    payout: {
      type: "binary" as const,
      settlementType: "cash-settled" as const,
      currency: "USD",
      settlementValue: 1,
      contractSize: 1,
      yesPays: 1,
      noPays: 0,
      notionalValue: 1,
      finalSettlementFormula:
        "YES pays 1.00 USD if the resolution criterion holds as stated in the canonical statement; NO pays 0.00 USD. If the criterion does not hold, YES pays 0.00 USD and NO pays 1.00 USD.",
      finalSettlementMethod:
        "Cash settled by exchange ledger entry after final resolution is confirmed and the dispute window has closed.",
    },
    integrity: {
      outcomeInfluenceAnalysis:
        "The CPI is computed from a statistically sampled basket of tens of thousands of prices collected across the United States. No single market participant can meaningfully influence the aggregate index.",
      informationAsymmetryAnalysis:
        "BLS employees with pre-publication access are subject to federal confidentiality requirements under 18 U.S.C. section 1905 and BLS internal policies.",
      sourceRobustnessAnalysis:
        "The CPI has been published continuously since 1913, making it one of the longest-running official statistical series.",
      surveillanceConsiderations: [
        "Monitor for unusual position-building immediately before CPI release dates.",
        "Watch for correlated trading across CPI-linked contracts on multiple venues.",
      ],
      overallSusceptibility: "low" as const,
      mitigations: [],
    },
    compliance: {
      intendedVenue: "cftc-designated-contract-market" as const,
      anticipatedListingPath: "part-40.2-self-certification" as const,
      draftDisclaimer:
        "DRAFT for internal and counsel review only. Not a CFTC filing, not a Part 40 self-certification, and not legal advice." as const,
      openQuestionsForCounsel: [
        "Confirm excluded-commodity classification applies to CPI-based binary event contracts.",
      ],
      reviewedAgainst: ["17 CFR Part 38 Appendix C", "CEA 5c(c)(5)(C)"],
    },
    accessRestrictions: {
      participantEligibility: {
        retailAccessPermitted: true,
        jurisdictionalRestrictions: [],
        additionalCriteria: [],
      },
      restrictedGroups: [
        {
          category: "material-nonpublic-info-holders" as const,
          rationale:
            "Persons with advance knowledge of the metric value could profit from foreknowledge of the resolution outcome.",
          restrictionType: "full-prohibition" as const,
          authority: "CEA §6(c)(1) / 17 CFR §180.1",
        },
        {
          category: "exchange-insiders" as const,
          rationale:
            "DCM employees, officers, and board members must not trade contracts listed on their own exchange.",
          restrictionType: "full-prohibition" as const,
          authority: "CEA §9(b) / DCM Core Principle 16",
        },
      ],
      sourceAffiliationControls: {
        sourceAffiliatedPersonsRestricted: false,
        affiliationDefinition:
          "Current employees and contractors of the data publisher with access to pre-release data.",
        enforcementMechanism:
          "Self-attestation at onboarding plus ongoing surveillance.",
      },
    },
    economicsAndUtility: {
      economicPurpose:
        "To estimate the market-implied probability that a specified economic indicator falls within a given range.",
      intendedMarketParticipants: [
        "Researchers and analysts evaluating economic policy hypotheses.",
        "Institutions with exposure to inflation or monetary-policy uncertainty.",
      ],
      hedgingOrRiskManagementUtility:
        "The contract may support risk-transfer use cases for entities exposed to inflation uncertainty.",
      priceDiscoveryUtility:
        "Contract prices estimate the market-implied probability that the underlying metric falls within the stated range.",
      relationshipToExistingReferenceMarkets:
        "No standardized futures or swaps market provides direct binary exposure to this specific range on this indicator.",
    },
    referenceMarketAnalysis: {
      referenceMarketDescription:
        "The reference is a national public-statistics measure published by the U.S. Bureau of Labor Statistics as part of the Consumer Price Index program.",
      sourceMethodology:
        "CPI is computed from a statistically sampled basket of prices collected across the United States, weighted by consumer expenditure patterns.",
      dataAvailability:
        "CPI data is publicly available on the BLS website on the scheduled release date each month.",
      historicalDataAvailable: true,
      historicalDataDescription:
        "Monthly CPI data has been published continuously since 1913, providing over 100 years of historical data accessible via the BLS public data API and archived reports.",
      liquidityOrMarketSizeAnalysis:
        "CPI is widely referenced in financial markets, including TIPS, inflation swaps, and CPI futures. The information environment is deep and liquid.",
      concentrationRiskAnalysis:
        "Resolution source concentration is moderate: the primary metric is produced solely by BLS, but BLS data is archived by multiple federal repositories and independently verifiable from microdata.",
      benchmarkOrReferenceGovernance:
        "BLS methodology is governed by federal statistical-agency standards with public documentation of any methodological changes.",
    },
  } as EventContractSpecT;
}

describe("expandRangeContracts", () => {
  test("produces one binary contract per range", () => {
    const spec = makeRangeSpec();
    const expanded = expandRangeContracts(spec);
    expect(expanded).toHaveLength(4);
  });

  test("each expanded contract has threshold criterion", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    for (const contract of expanded) {
      expect(contract.resolution.criterion.kind).toBe("threshold");
    }
  });

  test("maps interval types to correct comparators", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    const comparators = expanded.map((c) => {
      const crit = c.resolution.criterion;
      if (crit.kind !== "threshold") throw new Error("expected threshold");
      return crit.comparator;
    });
    expect(comparators).toEqual([
      "less-than",
      "between-inclusive-exclusive",
      "between-inclusive-exclusive",
      "greater-than-or-equal",
    ]);
  });

  test("adapts ticker per range", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    expect(expanded[0]!.meta.ticker).toContain("LT40");
    expect(expanded[1]!.meta.ticker).toContain("40TO45");
    expect(expanded[3]!.meta.ticker).toContain("GTE50");
  });

  test("adapts title per range", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    expect(expanded[0]!.meta.title).toContain("Below 40");
    expect(expanded[3]!.meta.title).toContain("50 and above");
  });

  test("sets binary outcome with range-specific definitions", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    for (const contract of expanded) {
      expect(contract.outcome.type).toBe("binary");
      expect(contract.outcome.yesDefinition).toContain("falls within");
      expect(contract.outcome.noDefinition).toContain("does not fall within");
    }
  });

  test("renders valid canonicalStatement for each expanded contract", () => {
    const expanded = expandRangeContracts(makeRangeSpec());
    for (const contract of expanded) {
      expect(contract.resolution.canonicalStatement).toMatch(
        /^This contract resolves YES if/,
      );
      expect(contract.resolution.canonicalStatement).toMatch(
        /otherwise it resolves NO\.$/,
      );
    }
  });

  test("throws for non-range-membership criterion", () => {
    const spec = makeRangeSpec();
    (spec.resolution.criterion as { kind: string }).kind = "threshold";
    expect(() => expandRangeContracts(spec)).toThrow("range-membership");
  });
});
