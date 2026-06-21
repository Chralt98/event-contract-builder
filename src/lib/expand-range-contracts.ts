import type { EventContractSpecT } from "../schema/event-contract";
import type { ProductNameStructureT } from "../cnl-product-name";
import {
  parseInterval,
  type ParsedInterval,
  type RangeDefinitionT,
} from "../schema/criterion-range-membership";
import { renderCanonicalStatement } from "../cnl-resolution-statement";
import { renderProductName } from "../cnl-product-name";

type ThresholdComparator =
  | "greater-than"
  | "greater-than-or-equal"
  | "less-than"
  | "less-than-or-equal"
  | "between-inclusive"
  | "between-inclusive-exclusive"
  | "between-exclusive-inclusive"
  | "between-exclusive";

interface ThresholdFromRange {
  comparator: ThresholdComparator;
  threshold: number;
  thresholdUpper?: number;
}

function intervalToThreshold(iv: ParsedInterval): ThresholdFromRange {
  const lo = iv.lowerBound;
  const hi = iv.upperBound;

  if (lo === null && hi !== null) {
    return {
      comparator: iv.upperInclusive ? "less-than-or-equal" : "less-than",
      threshold: hi,
    };
  }

  if (lo !== null && hi === null) {
    return {
      comparator: iv.lowerInclusive ? "greater-than-or-equal" : "greater-than",
      threshold: lo,
    };
  }

  if (lo !== null && hi !== null) {
    const comparator: ThresholdComparator =
      iv.lowerInclusive && iv.upperInclusive
        ? "between-inclusive"
        : iv.lowerInclusive && !iv.upperInclusive
          ? "between-inclusive-exclusive"
          : !iv.lowerInclusive && iv.upperInclusive
            ? "between-exclusive-inclusive"
            : "between-exclusive";
    return { comparator, threshold: lo, thresholdUpper: hi };
  }

  throw new Error("Unbounded interval (-inf, +inf) cannot map to a threshold");
}

function productNameForRange(
  range: RangeDefinitionT,
  iv: ParsedInterval,
  metricName: string,
  unit: string,
): { structure: ProductNameStructureT; displayName: string } {
  if (iv.lowerBound !== null && iv.upperBound !== null) {
    const structure = {
      template: "numeric-range" as const,
      metric: metricName,
      lower: iv.lowerBound,
      upper: iv.upperBound,
      unit,
    };
    return { structure, displayName: renderProductName(structure) };
  }

  if (iv.lowerBound === null && iv.upperBound !== null) {
    const structure = {
      template: "numeric-threshold" as const,
      metric: metricName,
      comparator: "below" as const,
      value: iv.upperBound,
      unit,
    };
    return { structure, displayName: renderProductName(structure) };
  }

  const structure = {
    template: "numeric-threshold" as const,
    metric: metricName,
    comparator: (iv.lowerInclusive ? "at-least" : "above") as
      | "at-least"
      | "above",
    value: iv.lowerBound!,
    unit,
  };
  return { structure, displayName: renderProductName(structure) };
}

/**
 * Expand a range-membership spec into N independent binary threshold contracts.
 * Throws if the spec's criterion is not `range-membership`.
 */
export function expandRangeContracts(
  spec: EventContractSpecT,
): EventContractSpecT[] {
  const { criterion } = spec.resolution;
  if (criterion.kind !== "range-membership") {
    throw new Error(
      `Expected range-membership criterion, got ${criterion.kind}`,
    );
  }

  const { metric, ranges } = criterion;

  return ranges.map((range) => {
    const iv = parseInterval(range.interval)!;
    const th = intervalToThreshold(iv);
    const pn = productNameForRange(range, iv, metric.name, metric.unit);

    const tickerSuffix = range.id.toUpperCase().replace(/-/g, "");
    const ticker = `${spec.meta.ticker}.${tickerSuffix}`.slice(0, 30);

    const expanded: EventContractSpecT = {
      ...spec,
      meta: {
        ...spec.meta,
        ticker,
        productName: pn,
        title: `${spec.meta.title} — ${range.label}`,
        shortTitle: range.label.slice(0, 50),
      },
      outcome: {
        type: "binary",
        values: ["Yes", "No"],
        yesDefinition: `The value of ${metric.name} falls within the interval ${range.interval} ${metric.unit}.`,
        noDefinition: `The value of ${metric.name} does not fall within the interval ${range.interval} ${metric.unit}.`,
      },
      resolution: {
        ...spec.resolution,
        criterion: {
          kind: "threshold" as const,
          metric,
          ...th,
        },
        canonicalStatement: "", // placeholder, rendered below
      },
      payout: {
        type: "binary" as const,
        settlementType: "cash-settled" as const,
        currency: spec.payout.currency,
        settlementValue: spec.payout.settlementValue,
        contractSize: spec.payout.contractSize,
        yesPays: spec.payout.contractSize,
        noPays: 0,
        payoutVector: [
          {
            condition: `Value in ${range.interval}`,
            yesPays: spec.payout.contractSize,
            noPays: 0,
          },
          {
            condition: `Value not in ${range.interval}`,
            yesPays: 0,
            noPays: spec.payout.contractSize,
          },
        ],
        notionalValue: spec.payout.contractSize * spec.payout.contractSize,
        finalSettlementFormula: spec.payout.finalSettlementFormula,
        finalSettlementMethod: spec.payout.finalSettlementMethod,
      },
    };

    expanded.resolution.canonicalStatement = renderCanonicalStatement(expanded);

    return expanded;
  });
}
