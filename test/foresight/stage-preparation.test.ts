import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  approvalStageSchema,
  PreparationReceipt,
  foresightStageMaterials,
  foresightTools,
} from "../../src/foresight";

test("preparation receipts accept bounded opaque tokens without requiring UUIDs", () => {
  expect(PreparationReceipt.safeParse("sp1.payload.signature").success).toBe(
    true,
  );
  expect(PreparationReceipt.safeParse("").success).toBe(false);
  expect(PreparationReceipt.safeParse("x".repeat(513)).success).toBe(false);
});

test("stage bundles contain the canonical skill and its required references", () => {
  for (const stage of approvalStageSchema.options) {
    const materials = foresightStageMaterials[stage];
    for (const document of [materials.skill, ...materials.references]) {
      expect(document.content).toBe(
        readFileSync(
          new URL(`../../${document.path}`, import.meta.url),
          "utf8",
        ),
      );
    }
    const skillFolder = materials.skill.path.replace(/SKILL.md$/, "");
    const linked = Array.from(
      materials.skill.content.matchAll(
        /\]\((references\/[^)#]+\.md)(?:#[^)]*)?\)/g,
      ),
    );
    for (const match of linked)
      expect(materials.references.map((reference) => reference.path)).toContain(
        skillFolder + match[1],
      );
  }
});

test("stage proposals require a preparation receipt", () => {
  const schema = z.toJSONSchema(
    foresightTools.propose_forecast_specification_stage_changes.inputSchema,
  );
  expect(schema.required).toContain("preparation_receipt");
});
