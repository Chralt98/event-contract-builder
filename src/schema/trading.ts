import { z } from "zod";
import { IanaTimezone, IsoDateTime, checkTimezoneOffset } from "./common";

/* -------------------------------------------------------------------------- */
/* §5 Trading parameters                                                      */
/* -------------------------------------------------------------------------- */

export const Trading = z
  .object({
    /** Price quotation convention. */
    quotation: z.enum(["cents-0-100", "probability-0-1", "currency-per-unit"]),
    /** Minimum price increment / fluctuation (tick size). Governs price ladder construction. */
    minTickSize: z.number().positive(),
    tradingHours: z
      .string()
      .min(5)
      .describe("E.g. '08:00–22:00 America/New_York, Mon–Fri'"),
    listingCycle: z
      .string()
      .min(10)
      .describe(
        "Describes the listing series, e.g. 'Single listing cycle for the 2030 outcome.'",
      ),
    firstTradingTime: IsoDateTime,
    /** Trading must stop at or before resolution-relevant information events. */
    lastTradingTime: IsoDateTime,
    /** When the underlying value is observed to determine the outcome. */
    expirationTime: IsoDateTime,
    /** Governing IANA timezone for all trading times. */
    tradingTimezone: IanaTimezone,
    /** What is measured at expiration to determine settlement. */
    expirationValue: z
      .string()
      .min(20)
      .describe(
        "E.g. 'The Expiration Value is the value of the Underlying as documented by the Source Agency on the Expiration Date at the Expiration Time.'",
      ),
    positionLimits: z.discriminatedUnion("mode", [
      z.object({
        mode: z.literal("position-limit"),
        contracts: z.number().int().positive(),
      }),
      z.object({
        mode: z.literal("accountability-level"),
        contracts: z.number().int().positive(),
      }),
    ]),
    settlementTiming: z
      .string()
      .min(10)
      .describe("When funds move after final resolution"),
  })
  .superRefine((t, ctx) => {
    if (t.firstTradingTime >= t.lastTradingTime) {
      ctx.addIssue({
        code: "custom",
        path: ["firstTradingTime"],
        message: "firstTradingTime must be before lastTradingTime",
      });
    }
    if (t.lastTradingTime > t.expirationTime) {
      ctx.addIssue({
        code: "custom",
        path: ["lastTradingTime"],
        message:
          "lastTradingTime must be at or before expirationTime",
      });
    }
    for (const field of [
      "firstTradingTime",
      "lastTradingTime",
      "expirationTime",
    ] as const) {
      const err = checkTimezoneOffset(t[field], t.tradingTimezone);
      if (err) {
        ctx.addIssue({ code: "custom", path: [field], message: err });
      }
    }
  })
  .describe("Listing/trading terms a DCM product committee will ask about");

export type TradingT = z.infer<typeof Trading>;
