import { z } from "zod";

export const PLATFORMS = [
  "Uber",
  "Lyft",
  "DoorDash",
  "Instacart",
  "AmazonFlex",
  "Other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const isPlatform = (value: unknown): value is Platform =>
  typeof value === "string" && PLATFORMS.some((platform) => platform === value);

const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

function numericField(label: string, required = false) {
  return z.string().superRefine((value, context) => {
    if (value === "") {
      if (required) {
        context.addIssue({ code: "custom", message: `${label} is required` });
      }
      return;
    }

    if (!DECIMAL_PATTERN.test(value) || !Number.isFinite(Number(value))) {
      context.addIssue({ code: "custom", message: `Enter a valid ${label.toLowerCase()}` });
      return;
    }

    if (Number(value) < 0) {
      context.addIssue({ code: "custom", message: `${label} cannot be negative` });
    }
  });
}

const localDateTimeField = (label: string) =>
  z.string().superRefine((value, context) => {
    if (value === "") {
      context.addIssue({ code: "custom", message: `${label} is required` });
      return;
    }

    const date = new Date(value);
    const validFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    const normalized = Number.isFinite(date.getTime())
      ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
      : "";
    if (!validFormat || normalized !== value) {
      context.addIssue({ code: "custom", message: `Enter a valid ${label.toLowerCase()}` });
    }
  });

export const entrySchema = z
  .object({
    platform: z.enum(PLATFORMS, { message: "Select a valid platform" }),
    started_at: localDateTimeField("Start time"),
    ended_at: localDateTimeField("End time"),
    gross: numericField("Gross earnings", true),
    tips: numericField("Tips"),
    miles: numericField("Miles"),
    fuel_cost: numericField("Fuel cost"),
    notes: z.string().max(1_000, "Notes must be 1,000 characters or fewer"),
  })
  .superRefine((value, context) => {
    const start = new Date(value.started_at).getTime();
    const end = new Date(value.ended_at).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
      context.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "End time must be after start time",
      });
    }
  });

export type EntryFormValues = z.input<typeof entrySchema>;

export const settingsSchema = z.object({
  mileageRate: numericField("Mileage rate", true),
  taxRate: numericField("Tax reserve rate", true).superRefine((value, context) => {
    if (DECIMAL_PATTERN.test(value) && Number(value) > 100) {
      context.addIssue({
        code: "custom",
        message: "Tax reserve rate cannot exceed 100%",
      });
    }
  }),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;

export function optionalNumber(value: string): number {
  return Number(value || "0");
}
