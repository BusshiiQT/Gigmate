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
  platform: z.enum(["Uber","Lyft","DoorDash","Instacart","AmazonFlex","Other"]),
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
      started_at: entry.started_at.slice(0, 16), // datetime-local format
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow">
        <h3 className="text-lg font-semibold mb-3">Edit Entry</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm mb-1">Platform</label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" {...register("platform")}>
                {["Uber","Lyft","DoorDash","Instacart","AmazonFlex","Other"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Miles</label>
              <input className="h-10 w-full rounded-md border px-3 text-sm" {...register("miles")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Start</label>
              <input type="datetime-local" className="h-10 w-full rounded-md border px-3 text-sm" {...register("started_at")} />
              {errors.started_at && <p className="text-xs text-red-600 mt-1">{String(errors.started_at.message)}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">End</label>
              <input type="datetime-local" className="h-10 w-full rounded-md border px-3 text-sm" {...register("ended_at")} />
              {errors.ended_at && <p className="text-xs text-red-600 mt-1">{String(errors.ended_at.message)}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Gross ($)</label>
              <input className="h-10 w-full rounded-md border px-3 text-sm" {...register("gross")} />
              {errors.gross && <p className="text-xs text-red-600 mt-1">{String(errors.gross.message)}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Tips ($)</label>
              <input className="h-10 w-full rounded-md border px-3 text-sm" {...register("tips")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Fuel cost ($)</label>
              <input className="h-10 w-full rounded-md border px-3 text-sm" {...register("fuel_cost")} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Notes</label>
              <textarea rows={3} className="w-full rounded-md border px-3 py-2 text-sm" {...register("notes")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
