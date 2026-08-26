"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { EntryRow } from "@/lib/types";
import { toCents } from "@/lib/utils";
import {
  entrySchema,
  optionalNumber,
  PLATFORMS,
  type EntryFormValues,
} from "@/lib/validation";
import {
  localDateTimeInputToUtcIso,
  utcIsoToLocalDateTimeInput,
} from "@/lib/datetime";

type FormValues = EntryFormValues;

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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      platform: entry.platform,
      started_at: utcIsoToLocalDateTimeInput(entry.started_at),
      ended_at: utcIsoToLocalDateTimeInput(entry.ended_at),
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
        started_at: localDateTimeInputToUtcIso(v.started_at),
        ended_at: localDateTimeInputToUtcIso(v.ended_at),
        gross_cents: toCents(v.gross),
        tips_cents: toCents(v.tips || "0"),
        miles: optionalNumber(v.miles),
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
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.platform && <FieldError message={errors.platform.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">Miles</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("miles")}
              />
              {errors.miles && <FieldError message={errors.miles.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">Start</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("started_at")}
              />
              {errors.started_at && <FieldError message={errors.started_at.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">End</label>
              <input
                type="datetime-local"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("ended_at")}
              />
              {errors.ended_at && <FieldError message={errors.ended_at.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">Gross ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("gross")}
              />
              {errors.gross && <FieldError message={errors.gross.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">Tips ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("tips")}
              />
              {errors.tips && <FieldError message={errors.tips.message} />}
            </div>

            <div>
              <label className="mb-1 block text-sm">Fuel cost ($)</label>
              <input
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("fuel_cost")}
              />
              {errors.fuel_cost && <FieldError message={errors.fuel_cost.message} />}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                {...register("notes")}
              />
              {errors.notes && <FieldError message={errors.notes.message} />}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;
}
