import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §3 Payout structures                                                       */
/* -------------------------------------------------------------------------- */

/** ISO 4217 currency code. */
export const Currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Must be an ISO 4217 code, e.g. USD")
  .describe("ISO 4217 currency code");

const PayoutBase = z.object({
  settlementType: z.literal("cash-settled"),
  currency: Currency,
  /** Face value of one contract in `currency` (e.g. 1.00 = $1 binary). */
  settlementValue: z
    .number()
    .positive()
    .describe("Par value of one contract in `currency`"),
  /** Notional paid per contract at full value (e.g. 1.00 = $1 binary). */
  contractSize: z
    .number()
    .positive()
    .describe("Maximum payout per contract in `currency`"),
});

/**
 * One row in the payout vector: maps a condition (expressed over outcome
 * states) to concrete YES and NO payout amounts. Replaces prose
 * finalSettlementFormula with a machine-readable decision table.
 */
export const PayoutVectorRow = z.object({
  condition: z
    .string()
    .min(5)
    .describe(
      "Expression over outcome states, e.g. 'YES' or 'criterion holds'",
    ),
  yesPays: z.number().min(0),
  noPays: z.number().min(0),
});

/** Binary YES/NO: pays `contractSize` on YES, 0 on NO. */
export const BinaryPayout = PayoutBase.extend({
  type: z.literal("binary"),
  yesPays: z.number().positive(),
  noPays: z.number().min(0).default(0),
  /** Structured payout decision table — each row maps a condition to concrete payouts. */
  payoutVector: z
    .array(PayoutVectorRow)
    .min(1)
    .max(10)
    .describe("Structured payout table mapping conditions to YES/NO payouts"),
}).describe(
  "Binary contract: fixed payout if the criterion holds, otherwise noPays (usually 0)",
);

export const Payout = z
  .discriminatedUnion("type", [BinaryPayout])
  .describe("Payout structure (binary | categorical | scalar)");

export type PayoutVectorRowT = z.infer<typeof PayoutVectorRow>;
export type PayoutT = z.infer<typeof Payout>;
