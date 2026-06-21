import { z } from "zod";
import { Resolution } from "./resolution";
import { Meta } from "./meta";
import { Underlying } from "./underlying";
import { Outcome } from "./outcome";
import { Trading } from "./trading";
import { Payout } from "./payout";
import { IntegrityAssessment as Integrity } from "./integrity-assessment";
import { PublicInterestAssessment } from "./public-interest-assessment";
import { Compliance } from "./compliance";
import { Contingency } from "./contingency";
import { renderContingencyStatement } from "../cnl-resolution-statement";

/**
 * Root schema for one event-contract specification document (one YAML file).
 */
export const EventContractSpec = z
  .object({
    /** DSL version this document targets. */
    dsl: z.literal("event-contract-cnl/0.1"),
    meta: Meta,
    underlying: Underlying,
    outcome: Outcome,
    trading: Trading,
    resolution: Resolution,
    payout: Payout,
    integrity: Integrity,
    /** Required when the enumerated-activity screen flags involvement. */
    publicInterestAssessment: PublicInterestAssessment.optional(),
    compliance: Compliance,
    /** Optional: makes this a conditional market (see Contingency). */
    contingency: Contingency.optional(),
  })
  .superRefine((spec, ctx) => {
    // Last trading time must not be after resolution deadline.
    if (spec.trading.lastTradingTime > spec.resolution.resolutionDeadline) {
      ctx.addIssue({
        code: "custom",
        path: ["trading", "lastTradingTime"],
        message:
          "lastTradingTime must be at or before resolution.resolutionDeadline",
      });
    }
    // Contingency invariants.
    if (spec.contingency) {
      const c = spec.contingency;
      for (const [i, cond] of c.conditions.entries()) {
        if (cond.evaluationDeadline > spec.resolution.resolutionDeadline) {
          ctx.addIssue({
            code: "custom",
            path: ["contingency", "conditions", i, "evaluationDeadline"],
            message:
              "condition evaluationDeadline must be at or before resolution.resolutionDeadline",
          });
        }
      }
      if (c.ifUnmet === "resolve-no" && spec.payout.type !== "binary") {
        ctx.addIssue({
          code: "custom",
          path: ["contingency", "ifUnmet"],
          message: "resolve-no is only meaningful for binary payouts",
        });
      }
      const rendered = renderContingencyStatement(c);
      if (rendered !== c.canonicalStatement) {
        ctx.addIssue({
          code: "custom",
          path: ["contingency", "canonicalStatement"],
          message: `canonicalStatement must equal the deterministic render: "${rendered}"`,
        });
      }
      // Enumerated-activity screen consistency (proposed § 40.11).
      const screen = spec.underlying.enumeratedActivityScreen;
      const anyInvolved = Object.values(screen.activities).some(
        (a) => a.settlementDeterminedByActivity,
      );
      if (anyInvolved !== screen.anyEnumeratedActivityInvolved) {
        ctx.addIssue({
          code: "custom",
          path: [
            "underlying",
            "enumeratedActivityScreen",
            "anyEnumeratedActivityInvolved",
          ],
          message:
            "anyEnumeratedActivityInvolved must equal whether any activity has settlementDeterminedByActivity === true",
        });
      }
      if (
        screen.anyEnumeratedActivityInvolved &&
        !spec.publicInterestAssessment
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["publicInterestAssessment"],
          message:
            "publicInterestAssessment is required when an enumerated activity is involved (proposed § 40.11(a)(5)-(6))",
        });
      }
      // If gaming is flagged involved, its three-prong definition test must be recorded.
      if (
        screen.activities.gaming.settlementDeterminedByActivity &&
        !screen.activities.gaming.gamingDefinition
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "underlying",
            "enumeratedActivityScreen",
            "activities",
            "gaming",
            "gamingDefinition",
          ],
          message:
            "record the proposed § 40.11(b)(1) three-prong gaming-definition test when gaming is assessed as involved",
        });
      }
    }
  })
  .describe(
    "Draft event-contract specification (CNL DSL v0.1) for pre-DCM review",
  )
  .transform((spec) => {
    const ccy = spec.payout.currency;
    const sv = spec.payout.settlementValue;
    const { priceQuoteMinimum, priceQuoteMaximum, priceQuoteConvention }: {
      priceQuoteMinimum: number;
      priceQuoteMaximum: number;
      priceQuoteConvention: string;
    } =
      spec.trading.quotation === "cents-0-100"
        ? {
            priceQuoteMinimum: 0,
            priceQuoteMaximum: 100,
            priceQuoteConvention:
              `Price quoted in cents per ${ccy} ${sv.toFixed(2)} contract. Range: 0 to 100 cents.`,
          }
        : spec.trading.quotation === "probability-0-1"
          ? {
              priceQuoteMinimum: 0,
              priceQuoteMaximum: 1,
              priceQuoteConvention:
                `Price quoted as probability per ${ccy} ${sv.toFixed(2)} contract. Range: 0 to 1.`,
            }
          : {
              priceQuoteMinimum: 0,
              priceQuoteMaximum: sv,
              priceQuoteConvention:
                `Price quoted in ${ccy} per ${ccy} ${sv.toFixed(2)} contract. Range: 0 to ${sv.toFixed(2)} ${ccy}.`,
            };
    return {
      ...spec,
      resolution: {
        ...spec.resolution,
        maximumResolutionDelayHours:
          (new Date(spec.resolution.resolutionDeadline).getTime() -
            new Date(spec.resolution.scheduledResolutionTime).getTime()) /
          (1000 * 60 * 60),
      },
      payout: {
        ...spec.payout,
        notionalValue:
          spec.payout.type === "binary"
            ? spec.payout.contractSize * spec.payout.yesPays
            : spec.payout.contractSize,
        finalSettlementFormula:
          spec.payout.type === "binary"
            ? `YES pays ${spec.payout.yesPays.toFixed(2)} ${ccy} if the resolution criterion holds as stated in the canonical statement; NO pays ${spec.payout.noPays.toFixed(2)} ${ccy}. If the criterion does not hold, YES pays ${spec.payout.noPays.toFixed(2)} ${ccy} and NO pays ${spec.payout.yesPays.toFixed(2)} ${ccy}.`
            : `Settlement per payout schedule in ${ccy}.`,
        finalSettlementMethod:
          `Cash settled by exchange ledger entry after final resolution is confirmed and the dispute window has closed.`,
      },
      trading: {
        ...spec.trading,
        priceQuoteMinimum,
        priceQuoteMaximum,
        priceQuoteConvention,
      },
    };
  });

export type EventContractSpecT = z.infer<typeof EventContractSpec>;
