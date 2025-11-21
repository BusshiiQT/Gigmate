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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
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

  // ESC to close
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose} // click outside closes
    >
      <div
        className="dialog-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <h3 className="mb-4 text-lg font-semibold">Edit Entry</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Platform</label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("platform")}
              >
                {[
                  "Uber",
                  "Lyft",
                  "DoorDash",
                  "Instacart",
                  "AmazonFlex",
                  "Other",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm">Miles</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("miles")}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Start</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("started_at")}
              />
              {errors.started_at && (
                <p className="mt-1 text-xs text-red-500">
                  {String(errors.started_at.message)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm">End</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("ended_at")}
              />
              {errors.ended_at && (
                <p className="mt-1 text-xs text-red-500">
                  {String(errors.ended_at.message)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm">Gross ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("gross")}
              />
              {errors.gross && (
                <p className="mt-1 text-xs text-red-500">
                  {String(errors.gross.message)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm">Tips ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("tips")}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Fuel cost ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("fuel_cost")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm">Notes</label>
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
