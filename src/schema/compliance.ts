import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §7 Compliance posture (draft-only)                                         */
/* -------------------------------------------------------------------------- */

export const Compliance = z
  .object({
    intendedVenue: z.literal("cftc-designated-contract-market"),
    /** Anticipated listing path — informational only at draft stage. */
    anticipatedListingPath: z.enum([
      "part-40.2-self-certification",
      "part-40.3-voluntary-approval",
      "undecided",
    ]),
    /** Mandatory disclaimer; the literal forces every document to carry it. */
    draftDisclaimer: z.literal(
      "DRAFT for internal and counsel review only. Not a CFTC filing, not a Part 40 self-certification, and not legal advice.",
    ),
    /** Open questions for counsel — empty array must be a deliberate claim. */
    openQuestionsForCounsel: z.array(z.string().min(10)),
    /** Cross-references this draft was checked against (free citation strings). */
    reviewedAgainst: z
      .array(z.string().min(5))
      .min(1)
      .describe(
        "E.g. '17 CFR Part 38 Appendix C', 'CEA 5c(c)(5)(C)', 'CFTC Staff Letter 26-08'",
      ),
  })
  .describe(
    "Draft compliance posture; intentionally cannot express a filed/certified state",
  );
