import { z } from "zod";
import { IsoDateTime } from "./common";

/* -------------------------------------------------------------------------- */
/* §5 Trading parameters                                                      */
/* -------------------------------------------------------------------------- */

export const Trading = z
  .object({
    /** Price quotation convention. */
    quotation: z.enum(["cents-0-100", "probability-0-1", "currency-per-unit"]),
    minTick: z.number().positive(),
    tradingHours: z
      .string()
      .min(5)
      .describe("E.g. '08:00–22:00 America/New_York, Mon–Fri'"),
    /** Trading must stop at or before resolution-relevant information events. */
    lastTradingTime: IsoDateTime,
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
  .describe("Listing/trading terms a DCM product committee will ask about");
