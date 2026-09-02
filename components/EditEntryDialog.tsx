"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
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
import { Save, X } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose} // click outside closes
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-entry-title"
        aria-describedby="edit-entry-description"
        className="dialog-panel flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="edit-entry-title" className="text-lg font-semibold tracking-tight">Edit Entry</h2>
            <p id="edit-entry-description" className="mt-1 text-sm text-muted-foreground">Update the details for this gig session.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-1 size-9 shrink-0 rounded-md text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="Close edit entry" title="Close" onClick={onClose}>
            <X aria-hidden="true" className="size-[18px]" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <DialogSection title="Platform">
              <FormField htmlFor="edit-platform" label="Platform" error={errors.platform?.message}>
              <Select id="edit-platform" aria-invalid={Boolean(errors.platform)} aria-describedby={errors.platform ? "edit-platform-error" : undefined} {...register("platform")}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p === "AmazonFlex" ? "Amazon Flex" : p}
                  </option>
                ))}
              </Select>
              </FormField>
            </DialogSection>

            <DialogSection title="Earnings">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="edit-gross" label="Gross earnings" description="Before tips and expenses." error={errors.gross?.message}>
                  <Input id="edit-gross" type="number" step="0.01" placeholder="0.00" aria-invalid={Boolean(errors.gross)} aria-describedby={errors.gross ? "edit-gross-error" : "edit-gross-description"} {...register("gross")} />
                </FormField>
                <FormField htmlFor="edit-tips" label="Tips" description="Cash or in-app tips." error={errors.tips?.message}>
                  <Input id="edit-tips" type="number" step="0.01" placeholder="0.00" aria-invalid={Boolean(errors.tips)} aria-describedby={errors.tips ? "edit-tips-error" : "edit-tips-description"} {...register("tips")} />
                </FormField>
              </div>
            </DialogSection>

            <DialogSection title="Expenses & mileage">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="edit-fuel_cost" label="Fuel cost" description="Actual cash spent on fuel." error={errors.fuel_cost?.message}>
                  <Input id="edit-fuel_cost" type="number" step="0.01" placeholder="0.00" aria-invalid={Boolean(errors.fuel_cost)} aria-describedby={errors.fuel_cost ? "edit-fuel_cost-error" : "edit-fuel_cost-description"} {...register("fuel_cost")} />
                </FormField>
                <FormField htmlFor="edit-miles" label="Miles driven" description="Business miles for this session." error={errors.miles?.message}>
                  <Input id="edit-miles" type="number" step="0.01" placeholder="0.00" aria-invalid={Boolean(errors.miles)} aria-describedby={errors.miles ? "edit-miles-error" : "edit-miles-description"} {...register("miles")} />
                </FormField>
              </div>
            </DialogSection>

            <DialogSection title="Session time">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField htmlFor="edit-started_at" label="Start" error={errors.started_at?.message}>
                  <Input id="edit-started_at" type="datetime-local" aria-invalid={Boolean(errors.started_at)} aria-describedby={errors.started_at ? "edit-started_at-error" : undefined} {...register("started_at")} />
                </FormField>
                <FormField htmlFor="edit-ended_at" label="End" error={errors.ended_at?.message}>
                  <Input id="edit-ended_at" type="datetime-local" aria-invalid={Boolean(errors.ended_at)} aria-describedby={errors.ended_at ? "edit-ended_at-error" : undefined} {...register("ended_at")} />
                </FormField>
              </div>
            </DialogSection>

            <DialogSection title="Notes">
              <FormField htmlFor="edit-notes" label="Notes (optional)" error={errors.notes?.message}>
                <Textarea id="edit-notes" rows={3} maxLength={1000} placeholder="Add anything useful about this session." aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? "edit-notes-error" : undefined} {...register("notes")} />
              </FormField>
            </DialogSection>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save aria-hidden="true" className="size-4" />
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DialogSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}
