import { z } from "zod";
import { ForecastSpecificationId } from "./workflow";
import { WorkspaceRevision } from "./workspace";

export const ExportFormat = z.enum(["yaml", "json", "markdown"]);
export const CompletionCommand = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("reopen"),
    forecast_specification_id: ForecastSpecificationId,
  }),
  z.strictObject({
    kind: z.literal("export"),
    forecast_specification_id: ForecastSpecificationId,
    formats: z.array(ExportFormat).min(1).max(3),
    expected_revision: WorkspaceRevision,
  }),
]);
export type CompletionCommand = z.infer<typeof CompletionCommand>;
export const CompletionSnapshot = z.strictObject({
  forecast_specification_id: ForecastSpecificationId,
  revision: WorkspaceRevision,
  ready: z.boolean(),
  complete: z.boolean(),
  news_available: z.boolean(),
  blocked_reason: z.string().optional(),
  actions: z
    .array(
      z.strictObject({
        kind: z.enum(["export", "feedback", "start_new"]),
        label: z.string(),
        enabled: z.boolean(),
        format: ExportFormat.optional(),
      }),
    )
    .max(10),
});
export type CompletionSnapshot = z.infer<typeof CompletionSnapshot>;
export const CompletionOutput = z.strictObject({
  completion: CompletionSnapshot,
  exports: z
    .array(
      z.strictObject({
        format: ExportFormat,
        text: z.string(),
        revision: WorkspaceRevision,
      }),
    )
    .max(3),
  review_markdown: z.string().min(1),
});
