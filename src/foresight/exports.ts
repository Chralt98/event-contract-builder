import { z } from "zod";
import { ForecastSpecificationId } from "./workflow";

/** Downloadable representations of one fully approved forecast specification. */
export const forecastSpecificationExportFormatSchema = z.enum([
  "yaml",
  "pdf",
  "json",
  "markdown",
]);

export type ForecastSpecificationExportFormat = z.infer<
  typeof forecastSpecificationExportFormatSchema
>;

export const forecastSpecificationExportInputSchema = z.object({
  forecast_specification_id: ForecastSpecificationId,
  formats: z
    .array(forecastSpecificationExportFormatSchema)
    .min(1)
    .max(4)
    .superRefine((formats, ctx) => {
      if (new Set(formats).size !== formats.length) {
        ctx.addIssue({
          code: "custom",
          message: "Each requested export format must be unique.",
        });
      }
    })
    .describe(
      "One or more formats to download after final approval. The user may choose these directly or together with a full-specification read-through; when both are requested, wait for correctness confirmation before downloading.",
    ),
});

export const forecastSpecificationDownloadSchema = z
  .object({
    format: forecastSpecificationExportFormatSchema,
    filename: z.string().min(1).describe("Stable filename for the download."),
    media_type: z
      .enum([
        "application/yaml",
        "application/pdf",
        "application/json",
        "text/markdown",
      ])
      .describe("MIME type of the generated file."),
    resource_uri: z
      .string()
      .min(1)
      .describe("Stable MCP resource URI for the downloadable file."),
  })
  .strict();

export const forecastSpecificationExportOutputSchema = z.object({
  forecast_specification_id: ForecastSpecificationId,
  downloads: z
    .array(forecastSpecificationDownloadSchema)
    .min(1)
    .max(4)
    .superRefine((downloads, ctx) => {
      const formats = downloads.map(({ format }) => format);
      if (new Set(formats).size !== formats.length) {
        ctx.addIssue({
          code: "custom",
          message: "Each requested export format must have one download.",
        });
      }
    }),
});

export type ForecastSpecificationExportInput = z.infer<
  typeof forecastSpecificationExportInputSchema
>;
export type ForecastSpecificationExportOutput = z.infer<
  typeof forecastSpecificationExportOutputSchema
>;
