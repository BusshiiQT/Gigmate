"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  platform: z.enum([
    "Uber",
    "Lyft",
    "DoorDash",
    "Instacart",
    "AmazonFlex",
    "Other",
  ]),
  started_at: z.string().min(1),
  ended_at: z.string().min(1),
  gross: z.string().min(1),
  tips: z.string().optional(),
  miles: z.string().optional(),
  fuel_cost: z.string().optional(),
  notes: z.string().optional(),
});

export type FormValues = z.infer<typeof schema>;

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

// helper to get local datetime string for <input type="datetime-local">
export function localDateTimeInputValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EntryForm({
  initialValues,
  onSaved,
}: {
  initialValues?: EntryFormInitial;
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
    for (const [k, v] of Object.entries(initialValues)) {
      setValue(k as keyof FormValues, v as any, { shouldDirty: true });
    }
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
    const gross_cents = Math.round(Number(values.gross) * 100);
    const tips_cents = Math.round(Number(values.tips || "0") * 100);
    const fuel_cost_cents = Math.round(Number(values.fuel_cost || "0") * 100);

    const { error } = await supabase.from("entries").insert({
      user_id: user.id,
      platform: values.platform,
      started_at: new Date(values.started_at).toISOString(),
      ended_at: new Date(values.ended_at).toISOString(),
      gross_cents,
      tips_cents,
      miles: Number(values.miles || "0"),
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
            <option value="Uber">Uber</option>
            <option value="Lyft">Lyft</option>
            <option value="DoorDash">DoorDash</option>
            <option value="Instacart">Instacart</option>
            <option value="AmazonFlex">Amazon Flex</option>
            <option value="Other">Other</option>
          </select>
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
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Start
          </label>
          <Input type="datetime-local" {...register("started_at")} />
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            End
          </label>
          <Input type="datetime-local" {...register("ended_at")} />
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
        </div>
      </div>

      {formState.errors && Object.keys(formState.errors).length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/60 dark:bg-red-950 dark:text-red-100">
          Please check the fields above.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit">Save Entry</Button>
      </div>
    </form>
  );
}
