"use client";

import * as React from "react";
import type { EntryRow } from "@/lib/types";
import { formatCurrency, durationHours } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import EditEntryDialog from "@/components/EditEntryDialog";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";

export default function EntriesTable({
  entries,
  onChanged,
}: {
  entries: EntryRow[];
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<EntryRow | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setBusyId(id);
    const { error } = await supabase.from("entries").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Entry deleted" });
      onChanged?.();
    }
  };

  if (entries.length === 0) {
    return (
      <EmptyState
        emoji="🗓️"
        title="No entries in this view"
        hint="Add your first entry to see stats and weekly net profit."
        cta={
          <Link href="/entries/new">
            <Button>+ Add your first entry</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="grid gap-3 sm:hidden">
        {entries.map((e) => (
          <div key={e.id} className="card p-3">
            <div className="flex justify-between">
              <div className="font-medium text-gray-900 dark:text-white">
                {new Date(e.started_at).toLocaleDateString()} • {e.platform}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {durationHours(e.started_at, e.ended_at).toFixed(2)}h
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-700 dark:text-gray-300">
                Miles: {Number(e.miles ?? 0).toFixed(2)}
              </div>
              <div className="text-right text-gray-900 dark:text-white">
                Gross: {formatCurrency(e.gross_cents)}
              </div>
              <div className="text-right text-gray-900 dark:text-white">
                Tips: {formatCurrency(e.tips_cents)}
              </div>
              <div className="text-right text-gray-900 dark:text-white">
                Fuel: {formatCurrency(e.fuel_cost_cents)}
              </div>
            </div>
            {e.notes && (
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {e.notes}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(e)}>
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => onDelete(e.id)}
                disabled={busyId === e.id}
              >
                {busyId === e.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border bg-white dark:border-white/10 dark:bg-[#0f141a] sm:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 dark:bg-[#0b0f14] dark:text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Platform</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-right">Miles</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">Tips</th>
              <th className="px-3 py-2 text-right">Fuel</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-gray-100">
            {entries.map((e) => (
              <tr key={e.id} className="border-t dark:border-white/10">
                <td className="px-3 py-2">
                  {new Date(e.started_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">{e.platform}</td>
                <td className="px-3 py-2">
                  {durationHours(e.started_at, e.ended_at).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(e.miles ?? 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(e.gross_cents)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(e.tips_cents)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(e.fuel_cost_cents)}
                </td>
                <td className="px-3 py-2">{e.notes ?? ""}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditing(e)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onDelete(e.id)}
                      disabled={busyId === e.id}
                    >
                      {busyId === e.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditEntryDialog
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => onChanged?.()}
        />
      )}
    </>
  );
}
