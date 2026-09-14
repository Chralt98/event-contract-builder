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
 * 1. **Resolution risk reduction.** Resolution rules remain explicit about
 *    evidence, source handling, exceptions, and unresolved outcomes while
 *    allowing the rule logic to fit the question being forecast.
 * 2. **Question-appropriate resolution language.** Resolution rules are open
 *    text rather than a closed comparator taxonomy, so they can express
 *    comparisons, occurrences, rankings, calculations, classifications, and
 *    other source-grounded methods. `productName` is a free-form question
 *    string authored by agents/LLMs via prompt guidance.
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
