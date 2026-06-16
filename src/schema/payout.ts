import { z } from "zod";

/** ISO 4217 currency code. */
export const Currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Must be an ISO 4217 code, e.g. USD")
  .describe("ISO 4217 currency code");

const PayoutBase = z.object({
  currency: Currency,
  /** Notional paid per contract at full value (e.g. 1.00 = $1 binary). */
  contractSize: z
    .number()
    .positive()
    .describe("Maximum payout per contract in `currency`"),
});

/** Binary YES/NO: pays `contractSize` on YES, 0 on NO. */
export const BinaryPayout = PayoutBase.extend({
  type: z.literal("binary"),
  yesPays: z.number().positive(),
  noPays: z.number().min(0).default(0),
}).describe(
  "Binary contract: fixed payout if the criterion holds, otherwise noPays (usually 0)",
);
