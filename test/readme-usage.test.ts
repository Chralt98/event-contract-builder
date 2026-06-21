import { describe, expect, test } from "bun:test";
import {
  EventContractSpec,
  renderCanonicalStatement,
  renderContingencyStatement,
  renderProductName,
  type EventContractSpecT,
} from "event-contract-builder";

/* -------------------------------------------------------------------------- */
/* Helpers: reusable fixture fragments                                        */
/* -------------------------------------------------------------------------- */

const NOT_INVOLVED = {
  settlementDeterminedByActivity: false,
  note: "",
};

function makeEnumeratedActivityScreen() {
  return {
    activities: {
      unlawfulUnderFederalOrStateLaw: NOT_INVOLVED,
      terrorism: NOT_INVOLVED,
      assassination: NOT_INVOLVED,
      war: NOT_INVOLVED,
      gaming: NOT_INVOLVED,
      commissionDesignatedSimilarActivity: NOT_INVOLVED,
    },
    settlementOccurrenceAnalysis:
      "Settlement is determined by the value of a government-published economic indicator, which is a lawful measurement activity.",
    anyEnumeratedActivityInvolved: false,
  };
}

function makeMeta(productName: {
  structure: Parameters<typeof renderProductName>[0];
  displayName: string;
}) {
  return {
    ticker: "CPI-26JUN-T3.0",
    seriesCode: "CPI-YOY",
    productName,
    title: "CPI Year-over-Year Rate >= 3.0% (June 2026)",
    shortTitle: "CPI YoY >= 3%",
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
  };
}

function makeUnderlying() {
  return {
    eventDefinition:
      "The U.S. Consumer Price Index for All Urban Consumers year-over-year percent change for the reference month of June 2026.",
    commodityClassification: {
      hypothesis: "excluded-commodity" as const,
      rationale:
        "CPI is an occurrence beyond the parties' control with clear economic consequence, fitting CEA section 1a(19)(iv) excluded-commodity definition.",
    },
    underlyingMarketDescription:
      "The Consumer Price Index (CPI) is published monthly by the U.S. Bureau of Labor Statistics. It measures the average change over time in the prices paid by urban consumers for a market basket of consumer goods and services. The CPI is widely followed by financial markets, policymakers, and the public as the primary gauge of consumer inflation in the United States.",
    enumeratedActivityScreen: makeEnumeratedActivityScreen(),
  };
}

function makeResolution() {
  return {
    criterion: {
      kind: "threshold" as const,
      metric: {
        name: "US CPI year-over-year rate",
        unit: "percent",
        extraction:
          "Read the annual percent change from the CPI-U all-items series (CUSR0000SA0) in the BLS CPI Summary table.",
        revisionPolicy: "first-published-value" as const,
        precision: 1,
      },
      comparator: "greater-than-or-equal" as const,
      threshold: 3,
    },
    canonicalStatement: "", // filled by render
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
    fallbacks: [
      {
        trigger: "primary-not-published-by-deadline" as const,
        sourceId: "bls-cpi",
        procedure:
          "If the BLS has not published by the deadline, extend the resolution deadline by 30 calendar days and re-check.",
      },
    ],
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
  };
}

function makeTrading() {
  return {
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
    positionLimits: {
      mode: "position-limit" as const,
      contracts: 25000,
    },
    settlementTiming:
      "Settlement occurs within two business days after final resolution is confirmed and the dispute window has closed.",
    priceQuoteMinimum: 0,
    priceQuoteMaximum: 100,
    priceQuoteConvention:
      "Price quoted in cents per USD 1.00 contract. Range: 0 to 100 cents.",
    expirationDate: "2027-01-15",
    expirationTimeLiteral:
      "The Expiration Time of the Contract shall be 4 PM UTC-05:00.",
  };
}

function makePayout() {
  return {
    type: "binary" as const,
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
  };
}

function makeIntegrity() {
  return {
    outcomeInfluenceAnalysis:
      "The CPI is computed from a statistically sampled basket of tens of thousands of prices collected across the United States. No single market participant can meaningfully influence the aggregate index. The cost of attempting to distort CPI through coordinated price manipulation across the sampled basket would be astronomically high relative to any plausible contract position.",
    informationAsymmetryAnalysis:
      "BLS employees with pre-publication access are subject to federal confidentiality requirements under 18 U.S.C. section 1905 and BLS internal policies. The release schedule is publicly announced and the data is embargoed until the scheduled release time. No private party receives advance access to the CPI figures.",
    sourceRobustnessAnalysis:
      "The CPI has been published continuously since 1913, making it one of the longest-running official statistical series. The methodology is publicly documented, subject to periodic review by external advisory committees, and resistant to short-term manipulation due to its broad sampling frame and established collection procedures.",
    surveillanceConsiderations: [
      "Monitor for unusual position-building immediately before CPI release dates, which could indicate information leakage.",
      "Watch for correlated trading across CPI-linked contracts on multiple venues that could signal coordinated activity.",
    ],
    overallSusceptibility: "low" as const,
    mitigations: [],
  };
}

function makeCompliance() {
  return {
    intendedVenue: "cftc-designated-contract-market" as const,
    anticipatedListingPath: "part-40.2-self-certification" as const,
    draftDisclaimer:
      "DRAFT for internal and counsel review only. Not a CFTC filing, not a Part 40 self-certification, and not legal advice." as const,
    openQuestionsForCounsel: [
      "Confirm excluded-commodity classification applies to CPI-based binary event contracts under CEA section 1a(19)(iv).",
    ],
    reviewedAgainst: ["17 CFR Part 38 Appendix C", "CEA 5c(c)(5)(C)"],
  };
}

function makeAccessRestrictions() {
  return {
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
  };
}

function makeEconomicsAndUtility() {
  return {
    economicPurpose:
      "To estimate the market-implied probability that a specified economic indicator exceeds a given threshold.",
    intendedMarketParticipants: [
      "Researchers and analysts evaluating economic policy hypotheses.",
      "Institutions with exposure to inflation or monetary-policy uncertainty.",
    ],
    hedgingOrRiskManagementUtility:
      "The contract may support risk-transfer use cases for entities exposed to inflation uncertainty.",
    priceDiscoveryUtility:
      "Contract prices estimate the market-implied probability that the underlying metric exceeds the stated threshold.",
    relationshipToExistingReferenceMarkets:
      "No standardized futures or swaps market provides direct binary exposure to this specific threshold on this indicator.",
  };
}

function makeReferenceMarketAnalysis() {
  return {
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
  };
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("README usage example", () => {
  test("renders and validates the canonical statement from structured resolution fields", () => {
    const productNameStructure = {
      template: "numeric-threshold" as const,
      metric: "CPI YoY",
      comparator: "at-least" as const,
      value: 3,
      unit: "percent",
    };
    const displayName = renderProductName(productNameStructure);

    const spec: EventContractSpecT = {
      dsl: "event-contract-cnl/0.1",
      meta: makeMeta({ structure: productNameStructure, displayName }),
      underlying: makeUnderlying(),
      outcome: {
        type: "binary",
        values: ["Yes", "No"],
        yesDefinition:
          "The resolution criterion holds as stated in the canonical statement.",
        noDefinition: "The resolution criterion does not hold.",
      },
      trading: makeTrading(),
      resolution: makeResolution(),
      payout: { ...makePayout(), settlementType: "cash-settled" as const },
      integrity: makeIntegrity(),
      compliance: makeCompliance(),
      accessRestrictions: makeAccessRestrictions(),
      economicsAndUtility: makeEconomicsAndUtility(),
      referenceMarketAnalysis: makeReferenceMarketAnalysis(),
    };

    const canonicalStatement = renderCanonicalStatement(spec);
    const validatedSpec = EventContractSpec.parse({
      ...spec,
      resolution: { ...spec.resolution, canonicalStatement },
    });

    expect(validatedSpec.resolution.canonicalStatement).toBe(
      "This contract resolves YES if US CPI year-over-year rate, as published by U.S. Bureau of Labor Statistics (Consumer Price Index), measured over the period from 2026-01-01T00:00:00Z to 2026-12-31T23:59:59Z (UTC), is greater than or equal to 3 percent (rounded to 1 decimal places), applying the first published value as of the resolution deadline; otherwise it resolves NO.",
    );
    expect(validatedSpec.resolution.maximumResolutionDelayHours).toBeCloseTo(
      (new Date("2027-01-31T23:59:59Z").getTime() -
        new Date("2027-01-15T12:00:00Z").getTime()) /
        (1000 * 60 * 60),
    );
    expect(validatedSpec.payout.notionalValue).toBe(1);
    expect(validatedSpec.trading.priceQuoteMinimum).toBe(0);
    expect(validatedSpec.trading.priceQuoteMaximum).toBe(100);
    expect(validatedSpec.trading.priceQuoteConvention).toBe(
      "Price quoted in cents per USD 1.00 contract. Range: 0 to 100 cents.",
    );
    expect(validatedSpec.payout.finalSettlementFormula).toContain("YES pays 1.00 USD");
    expect(validatedSpec.payout.finalSettlementMethod).toContain("Cash settled by exchange ledger entry");
  });
});

describe("Product name rendering", () => {
  test.each([
    {
      label: "binary-event",
      structure: {
        template: "binary-event" as const,
        subject: "Kansas City Chiefs",
        verbPhrase: "win the 2027 Super Bowl",
      },
      expected: "Will Kansas City Chiefs win the 2027 Super Bowl?",
    },
    {
      label: "binary-event-with-date",
      structure: {
        template: "binary-event-with-date" as const,
        subject: "Elon Musk",
        verbPhrase: "join the Federal Reserve Board",
        preposition: "before" as const,
        date: "January 20, 2027",
      },
      expected:
        "Will Elon Musk join the Federal Reserve Board before January 20, 2027?",
    },
    {
      label: "numeric-threshold",
      structure: {
        template: "numeric-threshold" as const,
        metric: "GDP growth",
        comparator: "above" as const,
        value: 3,
        unit: "percent",
      },
      expected: "Will GDP growth be above 3 percent?",
    },
    {
      label: "numeric-range",
      structure: {
        template: "numeric-range" as const,
        metric: "CPI YoY",
        lower: 2.5,
        upper: 3.0,
        unit: "percent",
      },
      expected: "Will CPI YoY be between 2.5 and 3 percent?",
    },
    {
      label: "selection-winner with context",
      structure: {
        template: "selection-winner" as const,
        entityType: "candidate",
        winCondition: "have the largest margin of victory",
        context: "the 2026 US Senate elections",
      },
      expected:
        "Which candidate will have the largest margin of victory in the 2026 US Senate elections?",
    },
    {
      label: "selection-winner without context",
      structure: {
        template: "selection-winner" as const,
        entityType: "team",
        winCondition: "win the 2027 Super Bowl",
      },
      expected: "Which team will win the 2027 Super Bowl?",
    },
    {
      label: "open-numeric",
      structure: {
        template: "open-numeric" as const,
        metric: "the price of Bitcoin",
        preposition: "on" as const,
        date: "January 1, 2027",
      },
      expected: "What will the price of Bitcoin be on January 1, 2027?",
    },
    {
      label: "compound-event-set with events",
      structure: {
        template: "compound-event-set" as const,
        outcomes:
          "all three of [Democrats win GA, Democrats win AZ, Democrats win NV]",
        events: "the 2026 US Senate elections",
      },
      expected:
        "Will all three of [Democrats win GA, Democrats win AZ, Democrats win NV] occur in the 2026 US Senate elections?",
    },
    {
      label: "compound-event-set without events",
      structure: {
        template: "compound-event-set" as const,
        outcomes: "both Fed rate cuts and CPI above 3 percent",
      },
      expected: "Will both Fed rate cuts and CPI above 3 percent occur?",
    },
  ])("renders $label template", ({ structure, expected }) => {
    expect(renderProductName(structure)).toBe(expected);
  });
});

describe("Full spec with contingency", () => {
  test("validates a complete spec including optional contingency and public-interest assessment", () => {
    const productNameStructure = {
      template: "binary-event-with-date" as const,
      subject: "the Fed",
      verbPhrase: "cut rates by at least 50 basis points",
      preposition: "before" as const,
      date: "December 31, 2026",
    };
    const displayName = renderProductName(productNameStructure);

    const contingencyFields = {
      mode: "all-of" as const,
      conditions: [
        {
          id: "no-recession",
          clause:
            "The NBER Business Cycle Dating Committee has not declared a U.S. recession with a peak date in 2026.",
          evidenceStandard:
            "No NBER announcement of a 2026-peak recession has been published on the NBER website by the evaluation deadline.",
          evaluationDeadline: "2027-01-15T23:59:59Z",
        },
      ],
      ifUnmet: "void-and-refund" as const,
      canonicalStatement: "", // filled by render
    };

    const contingencyStatement = renderContingencyStatement(contingencyFields);

    const gamingInvolved = {
      settlementDeterminedByActivity: true,
      note: "Settlement is determined by the outcome of a gaming activity governed by league rules with measurable athletic outcomes.",
      gamingDefinition: {
        recreationOrEntertainment: true,
        governedByRules: true,
        measurableLuckSkillOrAthleticOutcome: true,
      },
    };

    const spec = {
      dsl: "event-contract-cnl/0.1" as const,
      meta: {
        ...makeMeta({ structure: productNameStructure, displayName }),
        ticker: "FED-RATE-26",
        title: "Fed Rate Cut >= 50bps Before End of 2026",
        category: "monetary-policy" as const,
        tags: ["fed", "rates"],
      },
      underlying: {
        ...makeUnderlying(),
        eventDefinition:
          "The Federal Reserve reduces the federal funds target rate by a cumulative total of at least 50 basis points from its level on January 1, 2026.",
        enumeratedActivityScreen: {
          ...makeEnumeratedActivityScreen(),
          activities: {
            ...makeEnumeratedActivityScreen().activities,
            gaming: gamingInvolved,
          },
          anyEnumeratedActivityInvolved: true,
        },
      },
      outcome: {
        type: "binary" as const,
        values: ["Yes", "No"] as ["Yes", "No"],
        yesDefinition:
          "The resolution criterion holds as stated in the canonical statement.",
        noDefinition: "The resolution criterion does not hold.",
      },
      trading: {
        ...makeTrading(),
        lastTradingTime: "2026-12-30T16:00:00-05:00",
        expirationTime: "2026-12-30T16:00:00-05:00",
      },
      resolution: {
        ...makeResolution(),
        criterion: {
          kind: "occurrence" as const,
          comparator: "occurs" as const,
          eventClause:
            "The Federal Open Market Committee announces a cumulative reduction of at least 50 basis points in the federal funds target rate relative to its January 1, 2026 level.",
          evidenceStandard:
            "The FOMC post-meeting statement published on the Federal Reserve website states a target rate at least 50 basis points below the January 1, 2026 level.",
        },
        scheduledResolutionTime: "2027-01-15T12:00:00Z",
        resolutionDeadline: "2027-01-31T23:59:59Z",
      },
      payout: { ...makePayout(), settlementType: "cash-settled" as const },
      integrity: makeIntegrity(),
      publicInterestAssessment: {
        economicPurposeAndInformationValue:
          "This contract provides price discovery on market expectations for Federal Reserve monetary policy actions, offering hedging utility for interest-rate-sensitive businesses and information value for policymakers and market participants tracking the trajectory of U.S. monetary policy.",
        informationLeakageAssessment: {
          sensitivityOfUnderlyingInformation:
            "FOMC decisions are made by a small committee with strict pre-meeting blackout periods and embargoed until the post-meeting statement is released.",
          concentrationOfInsight:
            "Outcome knowledge is concentrated among FOMC voting members and senior Fed staff with access to deliberations.",
          discreteDecisionRisk:
            "Settlement depends on a discrete committee vote by identifiable individuals, but the multi-member structure and institutional controls reduce single-actor risk.",
          safeguardAdequacy:
            "Federal Reserve institutional controls, inspector general oversight, and criminal penalties for unauthorized disclosure provide substantial safeguards against information asymmetry.",
        },
        selfRegulatoryBurden:
          "Standard surveillance tools can monitor for unusual pre-FOMC positioning patterns and cross-venue correlation.",
        gamingFactors: {
          outcomeGranularity: "aggregate-outcome" as const,
          outcomeGranularityAnalysis:
            "The contract settles on aggregate league-level outcomes rather than individual game results, reducing manipulation incentives.",
          leagueIntegrityInfrastructure:
            "Professional leagues maintain integrity offices with investigative authority and cooperation agreements with regulated gambling operators.",
          governingBodyInformationSharing:
            "DCM has established an information-sharing framework with the relevant league integrity office for surveillance and investigation purposes.",
          prohibitedSettlementBases: {
            playerInjury: false,
            officiatingDecisions: false,
            physicalAltercations: false,
            preCollegiateSports: false,
          },
        },
        draftSelfAssessment: "uncertain-needs-counsel" as const,
      },
      compliance: makeCompliance(),
      accessRestrictions: makeAccessRestrictions(),
      economicsAndUtility: makeEconomicsAndUtility(),
      referenceMarketAnalysis: makeReferenceMarketAnalysis(),
      contingency: {
        ...contingencyFields,
        canonicalStatement: contingencyStatement,
      },
    };

    const canonicalStatement = renderCanonicalStatement(
      spec as EventContractSpecT,
    );
    const fullSpec = {
      ...spec,
      resolution: { ...spec.resolution, canonicalStatement },
    };

    const validated = EventContractSpec.parse(fullSpec);

    expect(validated.meta.productName.displayName).toBe(
      "Will the Fed cut rates by at least 50 basis points before December 31, 2026?",
    );
    expect(validated.contingency!.canonicalStatement).toBe(
      contingencyStatement,
    );
    expect(validated.resolution.canonicalStatement).toBe(canonicalStatement);
    expect(validated.publicInterestAssessment).toBeDefined();
    expect(validated.compliance.draftDisclaimer).toContain("DRAFT");
  });
});
