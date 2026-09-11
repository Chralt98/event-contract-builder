import { z } from "zod";
import {
  ConnectorDraftUnit,
  parseConnectorDraftUnit,
} from "./connector-draft-unit";
import type { DraftUnitT } from "../../src/schema/display-question";

const UTC_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function isUtcTimestamp(value: string): boolean {
  if (!UTC_TIMESTAMP_RE.test(value)) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().replace(".000Z", "Z") === value
  );
}

function isIanaTimeZone(value: string): boolean {
  if (value === "UTC") return true;
  if (!value.includes("/")) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function timestampBefore(left: string, right: string): boolean {
  return Date.parse(left) < Date.parse(right);
}

function timestampAtOrBefore(left: string, right: string): boolean {
  return Date.parse(left) <= Date.parse(right);
}

export const utcTimestampSchema = z
  .string()
  .refine(isUtcTimestamp, "Use an ISO 8601 UTC timestamp ending in Z.");

export const ianaTimeZoneSchema = z
  .string()
  .min(1)
  .refine(isIanaTimeZone, "Use a valid named IANA time zone.");

const boundaryValueSchema = z.enum(["inclusive", "exclusive"]);

const timingDataShape = {
  timing_type: z.enum(["point_in_time", "measurement"]),
  event_deadline: utcTimestampSchema.optional(),
  observation_start: utcTimestampSchema.optional(),
  observation_end: utcTimestampSchema.optional(),
  boundary: z.object({
    start: boundaryValueSchema.optional(),
    end: boundaryValueSchema,
  }),
  time_zone: ianaTimeZoneSchema,
  evidence_rule: z.enum(["occurrence", "publication", "both"]),
  trading: z.object({
    start: utcTimestampSchema,
    end: utcTimestampSchema,
    time_zone: ianaTimeZoneSchema,
  }),
  expiration: z.object({
    datetime: utcTimestampSchema,
    time_zone: ianaTimeZoneSchema,
  }),
} as const;

function validateTiming(
  timing: z.infer<z.ZodObject<typeof timingDataShape>>,
  ctx: z.RefinementCtx,
): void {
  const boundaryEnd =
    timing.timing_type === "point_in_time"
      ? timing.event_deadline
      : timing.observation_end;

  if (timing.timing_type === "point_in_time") {
    if (!timing.event_deadline) {
      ctx.addIssue({
        code: "custom",
        path: ["event_deadline"],
        message: "Point-in-time timing requires event_deadline.",
      });
    }
    if (timing.observation_start || timing.observation_end) {
      ctx.addIssue({
        code: "custom",
        path: ["observation_start"],
        message: "Point-in-time timing must not include an observation window.",
      });
    }
    if (timing.boundary.start) {
      ctx.addIssue({
        code: "custom",
        path: ["boundary", "start"],
        message: "Point-in-time timing has no observation start boundary.",
      });
    }
  } else {
    if (!timing.observation_start || !timing.observation_end) {
      ctx.addIssue({
        code: "custom",
        path: ["observation_start"],
        message: "Measurement timing requires observation_start and observation_end.",
      });
    }
    if (timing.event_deadline) {
      ctx.addIssue({
        code: "custom",
        path: ["event_deadline"],
        message: "Measurement timing uses observation_end instead of event_deadline.",
      });
    }
    if (!timing.boundary.start) {
      ctx.addIssue({
        code: "custom",
        path: ["boundary", "start"],
        message: "Measurement timing requires a start boundary rule.",
      });
    }
    if (
      timing.observation_start &&
      timing.observation_end &&
      !timestampBefore(timing.observation_start, timing.observation_end)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["observation_end"],
        message: "observation_start must be before observation_end.",
      });
    }
  }

  if (!timestampBefore(timing.trading.start, timing.trading.end)) {
    ctx.addIssue({
      code: "custom",
      path: ["trading", "end"],
      message: "Trading start must be before trading end.",
    });
  }

  if (!timestampBefore(timing.trading.end, timing.expiration.datetime)) {
    ctx.addIssue({
      code: "custom",
      path: ["expiration", "datetime"],
      message: "Expiration must be after the last trading time.",
    });
  }

  if (boundaryEnd) {
    if (!timestampAtOrBefore(boundaryEnd, timing.expiration.datetime)) {
      ctx.addIssue({
        code: "custom",
        path: ["expiration", "datetime"],
        message: "Expiration must be at or after the event boundary.",
      });
    }
    if (!timestampAtOrBefore(timing.trading.end, boundaryEnd)) {
      ctx.addIssue({
        code: "custom",
        path: ["trading", "end"],
        message: "Last trading time must be at or before the event boundary.",
      });
    }
  }
}

export const timingDataSchema = z
  .object(timingDataShape)
  .superRefine(validateTiming);

export const timingPayloadShape = {
  unit_number: z.number().int(),
  selected_unit: ConnectorDraftUnit,
  ...timingDataShape,
  followUp: z.string(),
} as const;

export const timingPayloadSchema = z
  .object(timingPayloadShape)
  .superRefine(validateTiming);

export type TimingDataT = z.infer<typeof timingDataSchema>;
export type TimingPayloadT = z.infer<typeof timingPayloadSchema>;
export type ParsedTimingPayloadT = Omit<TimingPayloadT, "selected_unit"> & {
  selected_unit: DraftUnitT;
};

export function parseTimingPayload(payload: unknown): ParsedTimingPayloadT {
  const parsed = timingPayloadSchema.parse(payload);
  return {
    ...parsed,
    selected_unit: parseConnectorDraftUnit(parsed.selected_unit),
  };
}

export const TIMING_DEFINITION_LINES = [
  "- **Observation window:** The bounded period from the observation start through the observation end during which the measurement is made. A point-in-time occurrence market has no observation window unless the question explicitly makes it one.",
  "- **Event deadline / resolution deadline / observation end:** The binding last instant at which the underlying event may occur or the measurement period may end. The boundary rule states whether an occurrence or measurement at that exact instant is included.",
  "- **Expiration datetime:** The binding instant at which the contract stops awaiting facts and its final Expiration Value or Market Outcome is determined under the contract terms. It may be later than the event deadline or observation end when the authoritative evidence is published afterward or a defined review is required.",
  "- **Last trading time / market close:** The binding instant at which trading stops. It controls trading availability only; it does not decide whether the underlying event occurred.",
] as const;
