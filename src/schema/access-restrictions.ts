import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* §8 Access & participation restrictions                                     */
/*    (Core Principle 2 — fair access; Core Principle 3 — manipulation        */
/*     prevention; CEA §6(c)(1); 17 CFR §180.1)                              */
/* -------------------------------------------------------------------------- */

const RESTRICTED_CATEGORIES = [
  "material-nonpublic-info-holders",
  "exchange-insiders",
  "source-affiliated-persons",
  "underlying-participants",
  "underlying-officials",
  "underlying-governing-body",
  "government-officials",
  "custom",
] as const;

type RestrictedCategory = (typeof RESTRICTED_CATEGORIES)[number];

const BASELINE_CATEGORIES: readonly RestrictedCategory[] = [
  "material-nonpublic-info-holders",
  "exchange-insiders",
];

export const RestrictedGroup = z
  .object({
    category: z
      .enum(RESTRICTED_CATEGORIES)
      .describe(
        "Machine-readable class of persons restricted from trading this contract",
      ),
    label: z
      .string()
      .min(5)
      .optional()
      .describe("Human-readable label; required when category is 'custom'"),
    rationale: z
      .string()
      .min(30)
      .describe("Why this group poses a manipulation or integrity risk"),
    restrictionType: z
      .enum([
        "full-prohibition",
        "trade-reporting-required",
        "position-limit-override",
      ])
      .describe("Nature of the restriction imposed"),
    authority: z
      .string()
      .min(10)
      .describe(
        "Regulatory or exchange-rule basis, e.g. 'CEA §6(c)(1) / 17 CFR §180.1'",
      ),
  })
  .superRefine((g, ctx) => {
    if (g.category === "custom" && !g.label) {
      ctx.addIssue({
        code: "custom",
        path: ["label"],
        message: "label is required when category is 'custom'",
      });
    }
  })
  .describe("One class of persons restricted from trading this contract");

export const ParticipantEligibility = z
  .object({
    retailAccessPermitted: z
      .boolean()
      .describe("Whether non-ECP retail participants may trade this contract"),
    minimumAge: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Minimum participant age, if any"),
    jurisdictionalRestrictions: z
      .array(z.string().min(5))
      .default([])
      .describe(
        "Jurisdictions where participation is prohibited, e.g. 'OFAC-sanctioned jurisdictions'",
      ),
    additionalCriteria: z
      .array(z.string().min(10))
      .default([])
      .describe("Any further eligibility requirements beyond the defaults"),
  })
  .describe("General participant access criteria (Core Principle 2)");

export const SourceAffiliationControls = z
  .object({
    sourceAffiliatedPersonsRestricted: z
      .boolean()
      .describe(
        "Whether persons affiliated with any resolution source are restricted",
      ),
    affiliationDefinition: z
      .string()
      .min(30)
      .describe(
        "How affiliation with the source is determined, e.g. 'Current employees, contractors, and board members of the publisher.'",
      ),
    enforcementMechanism: z
      .string()
      .min(20)
      .describe(
        "How the restriction is monitored/enforced, e.g. 'Self-attestation at onboarding plus ongoing surveillance.'",
      ),
  })
  .describe(
    "Controls on trading by persons affiliated with resolution data sources (Appendix C)",
  );

export const GoverningBodyEngagement = z.discriminatedUnion("engaged", [
  z.object({
    engaged: z.literal(false),
    reason: z
      .string()
      .min(20)
      .describe("Why engagement has not occurred or is not applicable"),
  }),
  z.object({
    engaged: z.literal(true),
    details: z
      .string()
      .min(20)
      .describe(
        "Nature of the engagement, e.g. 'Ongoing data-sharing agreement with league integrity office.'",
      ),
  }),
]);

export const AccessRestrictions = z
  .object({
    participantEligibility: ParticipantEligibility,
    restrictedGroups: z
      .array(RestrictedGroup)
      .min(2)
      .describe(
        "At least the two CEA-baseline groups (material-nonpublic-info-holders, exchange-insiders) plus any contract-specific groups",
      ),
    governingBodyEngagement: GoverningBodyEngagement.optional().describe(
      "Whether the DCM has engaged with the relevant governing body regarding restricted participants",
    ),
    sourceAffiliationControls: SourceAffiliationControls,
  })
  .superRefine((a, ctx) => {
    const presentCategories = new Set<string>(a.restrictedGroups.map((g) => g.category));
    for (const required of BASELINE_CATEGORIES) {
      if (!presentCategories.has(required)) {
        ctx.addIssue({
          code: "custom",
          path: ["restrictedGroups"],
          message: `restrictedGroups must include a '${required}' entry (CEA baseline)`,
        });
      }
    }
    if (
      a.sourceAffiliationControls.sourceAffiliatedPersonsRestricted &&
      !presentCategories.has("source-affiliated-persons")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["restrictedGroups"],
        message:
          "restrictedGroups must include 'source-affiliated-persons' when sourceAffiliationControls.sourceAffiliatedPersonsRestricted is true",
      });
    }
  })
  .describe(
    "Participant eligibility, prohibited trader groups, and affiliated-source controls",
  );

export type RestrictedGroupT = z.infer<typeof RestrictedGroup>;
export type ParticipantEligibilityT = z.infer<typeof ParticipantEligibility>;
export type SourceAffiliationControlsT = z.infer<typeof SourceAffiliationControls>;
export type AccessRestrictionsT = z.infer<typeof AccessRestrictions>;
