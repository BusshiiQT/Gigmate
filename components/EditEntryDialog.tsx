"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { EntryRow, Platform } from "@/lib/types";
import { toCents } from "@/lib/utils";

const schema = z.object({
  platform: z.enum(["Uber", "Lyft", "DoorDash", "Instacart", "AmazonFlex", "Other"]),
  started_at: z.string().min(1),
  ended_at: z.string().min(1),
  gross: z.string().min(1),
  tips: z.string().optional(),
  miles: z.string().optional(),
  fuel_cost: z.string().optional(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.input<typeof schema>;

export default function EditEntryDialog({
  entry,
  onClose,
  onSaved,
}: {
  entry: EntryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      platform: entry.platform as Platform,
      started_at: entry.started_at.slice(0, 16),
      ended_at: entry.ended_at.slice(0, 16),
      gross: (entry.gross_cents / 100).toString(),
      tips: (entry.tips_cents / 100).toString(),
      miles: String(entry.miles ?? 0),
      fuel_cost: (entry.fuel_cost_cents / 100).toString(),
      notes: entry.notes ?? "",
    },
  });

  const onSubmit = async (v: FormValues) => {
    const { error } = await supabase
      .from("entries")
      .update({
        platform: v.platform,
        started_at: v.started_at,
        ended_at: v.ended_at,
        gross_cents: toCents(v.gross),
        tips_cents: toCents(v.tips || "0"),
        miles: parseFloat(v.miles || "0") || 0,
        fuel_cost_cents: toCents(v.fuel_cost || "0"),
        notes: v.notes ?? null,
      })
      .eq("id", entry.id);

    if (error) {
      toast({ title: "Update failed", description: error.message });
    } else {
      toast({ title: "Entry updated" });
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <h3 className="text-lg font-semibold mb-4">Edit Entry</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>
              <label className="block text-sm mb-1">Platform</label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("platform")}
              >
                {["Uber", "Lyft", "DoorDash", "Instacart", "AmazonFlex", "Other"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Miles</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("miles")}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Start</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("started_at")}
              />
              {errors.started_at && (
                <p className="text-xs text-red-500 mt-1">{String(errors.started_at.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">End</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("ended_at")}
              />
              {errors.ended_at && (
                <p className="text-xs text-red-500 mt-1">{String(errors.ended_at.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Gross ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("gross")}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Tips ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("tips")}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Fuel cost ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("fuel_cost")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("notes")}
              />
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
