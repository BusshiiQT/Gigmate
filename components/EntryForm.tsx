"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <form className="card space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Platform (native select) */}
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Platform
          </label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-700"
            defaultValue={initialValues?.platform ?? "Uber"}
            {...register("platform")}
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform === "AmazonFlex" ? "Amazon Flex" : platform}
              </option>
            ))}
          </select>
          {formState.errors.platform && <FieldError message={formState.errors.platform.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Gross ($)
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("gross")}
          />
          {formState.errors.gross && <FieldError message={formState.errors.gross.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Tips ($)
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("tips")}
          />
          {formState.errors.tips && <FieldError message={formState.errors.tips.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Fuel cost ($)
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("fuel_cost")}
          />
          {formState.errors.fuel_cost && <FieldError message={formState.errors.fuel_cost.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Miles
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("miles")}
          />
          {formState.errors.miles && <FieldError message={formState.errors.miles.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Start
          </label>
          <Input type="datetime-local" {...register("started_at")} />
          {formState.errors.started_at && <FieldError message={formState.errors.started_at.message} />}
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            End
          </label>
          <Input type="datetime-local" {...register("ended_at")} />
          {formState.errors.ended_at && <FieldError message={formState.errors.ended_at.message} />}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Notes
          </label>
          <Input
            type="text"
            placeholder="Optional notes"
            {...register("notes")}
          />
          {formState.errors.notes && <FieldError message={formState.errors.notes.message} />}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving…" : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;
}
