"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  entrySchema,
  optionalNumber,
  PLATFORMS,
  type EntryFormValues,
} from "@/lib/validation";
import {
  localDateTimeInputToUtcIso,
  localDateTimeInputValue,
} from "@/lib/datetime";

export type FormValues = EntryFormValues;

export type EntryFormInitial = Partial<{
  platform: FormValues["platform"];
  started_at: string;
  ended_at: string;
  gross: string;
  tips: string;
  miles: string;
  fuel_cost: string;
  notes: string;
}>;

export default function EntryForm({
  initialValues,
  onSaved,
}: {
  initialValues?: EntryFormInitial;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      platform: initialValues?.platform ?? "Uber",
      started_at: initialValues?.started_at ?? localDateTimeInputValue(),
      ended_at: initialValues?.ended_at ?? localDateTimeInputValue(),
      gross: initialValues?.gross ?? "",
      tips: initialValues?.tips ?? "",
      miles: initialValues?.miles ?? "",
      fuel_cost: initialValues?.fuel_cost ?? "",
      notes: initialValues?.notes ?? "",
    },
  });

  // Apply initial values when provided (e.g., "Duplicate last entry")
  React.useEffect(() => {
    if (!initialValues) return;
    if (initialValues.platform !== undefined) setValue("platform", initialValues.platform, { shouldDirty: true });
    if (initialValues.started_at !== undefined) setValue("started_at", initialValues.started_at, { shouldDirty: true });
    if (initialValues.ended_at !== undefined) setValue("ended_at", initialValues.ended_at, { shouldDirty: true });
    if (initialValues.gross !== undefined) setValue("gross", initialValues.gross, { shouldDirty: true });
    if (initialValues.tips !== undefined) setValue("tips", initialValues.tips, { shouldDirty: true });
    if (initialValues.miles !== undefined) setValue("miles", initialValues.miles, { shouldDirty: true });
    if (initialValues.fuel_cost !== undefined) setValue("fuel_cost", initialValues.fuel_cost, { shouldDirty: true });
    if (initialValues.notes !== undefined) setValue("notes", initialValues.notes, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.started_at]);

  const onSubmit = async (values: FormValues) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not signed in" });
      return;
    }

    // Convert to cents
    const gross_cents = Math.round(optionalNumber(values.gross) * 100);
    const tips_cents = Math.round(optionalNumber(values.tips) * 100);
    const fuel_cost_cents = Math.round(optionalNumber(values.fuel_cost) * 100);

    const { error } = await supabase.from("entries").insert({
      user_id: user.id,
      platform: values.platform,
      started_at: localDateTimeInputToUtcIso(values.started_at),
      ended_at: localDateTimeInputToUtcIso(values.ended_at),
      gross_cents,
      tips_cents,
      miles: optionalNumber(values.miles),
      fuel_cost_cents,
      notes: values.notes || null,
    });

    if (error) {
      toast({ title: "Save failed", description: error.message });
    } else {
      toast({ title: "Entry saved" });
      onSaved?.();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 sm:p-6">
      <form className="space-y-7" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormSection title="Platform">
          <FormField htmlFor="platform" label="Platform" error={formState.errors.platform?.message}>
          <Select
            id="platform"
            aria-invalid={Boolean(formState.errors.platform)}
            aria-describedby={formState.errors.platform ? "platform-error" : undefined}
            {...register("platform")}
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform === "AmazonFlex" ? "Amazon Flex" : platform}
              </option>
            ))}
          </Select>
          </FormField>
        </FormSection>

        <FormSection title="Earnings">
          <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="gross" label="Gross earnings" description="Before tips and expenses." error={formState.errors.gross?.message}>
          <Input
            id="gross"
            type="number"
            step="0.01"
            placeholder="0.00"
            aria-invalid={Boolean(formState.errors.gross)}
            aria-describedby={formState.errors.gross ? "gross-error" : "gross-description"}
            {...register("gross")}
          />
          </FormField>
          <FormField htmlFor="tips" label="Tips" description="Cash or in-app tips." error={formState.errors.tips?.message}>
          <Input
            id="tips"
            type="number"
            step="0.01"
            placeholder="0.00"
            aria-invalid={Boolean(formState.errors.tips)}
            aria-describedby={formState.errors.tips ? "tips-error" : "tips-description"}
            {...register("tips")}
          />
          </FormField>
          </div>
        </FormSection>

        <FormSection title="Expenses & mileage">
          <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="fuel_cost" label="Fuel cost" description="Actual cash spent on fuel." error={formState.errors.fuel_cost?.message}>
          <Input
            id="fuel_cost"
            type="number"
            step="0.01"
            placeholder="0.00"
            aria-invalid={Boolean(formState.errors.fuel_cost)}
            aria-describedby={formState.errors.fuel_cost ? "fuel_cost-error" : "fuel_cost-description"}
            {...register("fuel_cost")}
          />
          </FormField>
          <FormField htmlFor="miles" label="Miles driven" description="Business miles for this session." error={formState.errors.miles?.message}>
          <Input
            id="miles"
            type="number"
            step="0.01"
            placeholder="0.00"
            aria-invalid={Boolean(formState.errors.miles)}
            aria-describedby={formState.errors.miles ? "miles-error" : "miles-description"}
            {...register("miles")}
          />
          </FormField>
          </div>
        </FormSection>

        <FormSection title="Session time">
          <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="started_at" label="Start" error={formState.errors.started_at?.message}>
          <Input id="started_at" type="datetime-local" aria-invalid={Boolean(formState.errors.started_at)} aria-describedby={formState.errors.started_at ? "started_at-error" : undefined} {...register("started_at")} />
          </FormField>
          <FormField htmlFor="ended_at" label="End" error={formState.errors.ended_at?.message}>
          <Input id="ended_at" type="datetime-local" aria-invalid={Boolean(formState.errors.ended_at)} aria-describedby={formState.errors.ended_at ? "ended_at-error" : undefined} {...register("ended_at")} />
          </FormField>
          </div>
        </FormSection>

        <FormSection title="Notes">
          <FormField htmlFor="notes" label="Notes (optional)" error={formState.errors.notes?.message}>
          <Textarea
            id="notes"
            rows={4}
            maxLength={1000}
            placeholder="Add anything useful about this session."
            aria-invalid={Boolean(formState.errors.notes)}
            aria-describedby={formState.errors.notes ? "notes-error" : undefined}
            {...register("notes")}
          />
          </FormField>
        </FormSection>

      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" disabled={formState.isSubmitting}>
          <Save aria-hidden="true" className="size-4" />
          {formState.isSubmitting ? "Saving…" : "Save Entry"}
        </Button>
      </div>
      </form>
      </CardContent>
    </Card>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby={`new-entry-${title.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`}>
      <h2 id={`new-entry-${title.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
