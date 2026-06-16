import { z } from "zod";
import { renderProductName, NUMERIC_COMPARATOR_PHRASES } from "../cnl-product-name";

/**
 * Trader-facing question string rendered from `ProductNameStructure`.
 * Must start with Will/Which/What and end with ?.
 */
const ProductNameQuestion = z
  .string()
  .min(10)
  .max(200)
  .regex(
    /^(Will|Which|What)\b.*\?$/s,
    "Must start with Will, Which, or What and end with ?",
  )
  .refine(
    (s) =>
      !/\b(approximately|roughly|about|around|significant|materially|generally|etc\.?)\b/i.test(
        s,
      ),
    "Product name questions must not contain hedging terms",
  )
  .describe("Trader-facing question rendered deterministically from structure");

const NumericComparator = z
  .enum(["above", "below", "at-least", "at-most", "exactly"])
  .describe(
    `Closed comparator vocabulary: ${Object.keys(NUMERIC_COMPARATOR_PHRASES).join(", ")}`,
  );

/** "Will <subject> <verbPhrase>?" — e.g. "Will Kansas City Chiefs win the 2027 Super Bowl?" */
const BinaryEventStructure = z.object({
  template: z.literal("binary-event"),
  subject: z.string().min(1).max(100),
  verbPhrase: z.string().min(2).max(120),
});

/** "Will <subject> <verbPhrase> <preposition> <date>?" — e.g. "Will Elon Musk join the Fed before January 20, 2027?" */
const BinaryEventWithDateStructure = z.object({
  template: z.literal("binary-event-with-date"),
  subject: z.string().min(1).max(100),
  verbPhrase: z.string().min(2).max(120),
  preposition: z.enum(["before", "by", "on"]),
  date: z.string().min(1).max(60),
});

/** "Will <metric> be <comparator> <value><unit>?" — e.g. "Will GDP be above 3%?" */
const NumericThresholdStructure = z.object({
  template: z.literal("numeric-threshold"),
  metric: z.string().min(2).max(100),
  comparator: NumericComparator,
  value: z.number(),
  unit: z.string().max(20).default(""),
});

/** "Will <metric> be between <lower> and <upper><unit>?" — e.g. "Will CPI be between 2.5% and 3.0%?" */
const NumericRangeStructure = z
  .object({
    template: z.literal("numeric-range"),
    metric: z.string().min(2).max(100),
    lower: z.number(),
    upper: z.number(),
    unit: z.string().max(20).default(""),
  })
  .superRefine((s, ctx) => {
    if (s.lower >= s.upper) {
      ctx.addIssue({
        code: "custom",
        path: ["lower"],
        message: "lower must be less than upper",
      });
    }
  });

/**
 * "Which <entityType> will <winCondition> in <context>?" or without context.
 * e.g. "Which candidate will have the largest margin of victory in the 2026 US Senate race?"
 * e.g. "Which team will win the 2027 Super Bowl?"
 */
const SelectionWinnerStructure = z.object({
  template: z.literal("selection-winner"),
  entityType: z.string().min(2).max(60),
  winCondition: z.string().min(2).max(120),
  /** Omit when the context is already embedded in winCondition. */
  context: z.string().min(2).max(120).optional(),
});

/**
 * "What will <metric> be <preposition> <date>?"
 * e.g. "What will the price of Bitcoin be on January 1, 2027?"
 * Typically settles as strikes/buckets despite the open-ended question form.
 */
const OpenNumericStructure = z.object({
  template: z.literal("open-numeric"),
  metric: z.string().min(2).max(100),
  preposition: z.enum(["before", "on"]),
  date: z.string().min(1).max(60),
});

/**
 * "Will <outcomes> occur in <events>?" or without events.
 * e.g. "Will all three of [A, B, C] occur in the 2026 elections?"
 */
const CompoundEventSetStructure = z.object({
  template: z.literal("compound-event-set"),
  outcomes: z.string().min(2).max(200),
  /** Omit for self-contained outcome sets with no scoping event. */
  events: z.string().min(2).max(200).optional(),
});

export const ProductNameStructure = z
  .discriminatedUnion("template", [
    BinaryEventStructure,
    BinaryEventWithDateStructure,
    NumericThresholdStructure,
    NumericRangeStructure,
    SelectionWinnerStructure,
    OpenNumericStructure,
    CompoundEventSetStructure,
  ])
  .describe(
    "Structured product-name fields; displayName is rendered deterministically from these",
  );

export type ProductNameStructureT = z.infer<typeof ProductNameStructure>;

/**
 * Trader-facing product name: structured slots + a `displayName` that must
 * equal `renderProductName(structure)`. The same render-and-compare pattern
 * used for `resolution.canonicalStatement`.
 */
export const ProductName = z
  .object({
    structure: ProductNameStructure,
    displayName: ProductNameQuestion,
  })
  .superRefine((pn, ctx) => {
    const rendered = renderProductName(pn.structure);
    if (rendered !== pn.displayName) {
      ctx.addIssue({
        code: "custom",
        path: ["displayName"],
        message: `displayName must equal the deterministic render: "${rendered}"`,
      });
    }
  })
  .describe(
    "Trader-facing product name question rendered from structured template slots",
  );
