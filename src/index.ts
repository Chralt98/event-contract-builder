/**
 * Event Contract Specification DSL (draft)
 * =========================================
 *
 * A Zod-based, controlled-natural-language (CNL) schema for specifying
 * prediction-market event contracts with the precision expected in a
 * Designated Contract Market (DCM) product review.
 *
 * Design goals
 * ------------
 * 1. **Resolution risk reduction.** Every term that has historically caused
 *    resolution disputes (source unavailability, data revisions, ambiguous
 *    thresholds, timezone confusion, undefined outcomes) is a *required,
 *    structured* field — not free prose.
 * 2. **Controlled Natural Language.** Resolution criteria are built from
 *    enumerated comparators, fixed clause templates, and a closed vocabulary
 *    (see `src/cnl.ts` and `docs/cnl-grammar.md`). The human-readable
 *    `canonicalStatement`, `productName` is *rendered deterministically* from structured
 *    fields, so prose and machine-readable terms can never diverge.
 * 3. **DCM-review readiness.** Field groups map onto CEA section 5(d)
 *    Core Principle 3 ("not readily susceptible to manipulation") and the
 *    17 C.F.R. Part 38 Appendix C guidance, plus the documentation a DCM
 *    product committee typically wants before a 17 C.F.R. § 40.2 filing.
 *
 * Status
 * ------
 * DRAFT specification tooling only. Producing a document with this schema is
 * **not** a CFTC submission, self-certification, or legal advice. The schema
 * deliberately has no "certified" status value.
 */

export * from "./cnl";
export * from "./schema/event-contract";
export * from "./schema/outcome";
export * from "./schema/resolution";
export * from "./schema/access-restrictions";
export * from "./schema/economics-and-utility";
export * from "./schema/reference-market-analysis";
export * from "./lib/expand-range-contracts";
