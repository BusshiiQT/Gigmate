"use client";

import * as React from "react";
import Link from "next/link";
import { Clock3, Pencil, Plus, Route, Trash2 } from "lucide-react";

import type { EntryRow, SettingsRow } from "@/lib/types";
import { calculateEntry } from "@/lib/finance";
import { durationHours, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import EditEntryDialog from "@/components/EditEntryDialog";
import EmptyState from "@/components/EmptyState";

type EntriesTableProps = {
  entries: EntryRow[];
  settings: SettingsRow | null;
  onChanged?: () => void;
};

function getEntryTakeHome(entry: EntryRow, settings: SettingsRow) {
  return calculateEntry({
    grossCents: entry.gross_cents,
    tipsCents: entry.tips_cents,
    fuelCostCents: entry.fuel_cost_cents,
    miles: Number(entry.miles),
    mileageRateCents: settings.mileage_rate_cents,
    taxRateBps: settings.tax_rate_bps,
    startedAtMilliseconds: new Date(entry.started_at).getTime(),
    endedAtMilliseconds: new Date(entry.ended_at).getTime(),
  }).estimatedTakeHomeCents;
}

function formatEntryDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EntriesTable({
  entries,
  settings,
  onChanged,
}: EntriesTableProps) {
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
        title="No entries in this view"
        hint="Add a gig session to see earnings, costs, and take-home here."
        cta={<Link href="/entries/new"><Button><Plus aria-hidden="true" className="size-4" />Add your first entry</Button></Link>}
      />
    );
  }

  return (
    <section aria-labelledby="recent-activity-heading">
      <Card>
        <CardHeader className="pb-3">
          <h2
            id="recent-activity-heading"
            className="text-base font-semibold leading-none tracking-tight"
          >
            Recent activity
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:hidden">
            {entries.map((entry) => {
              const takeHome = settings ? getEntryTakeHome(entry, settings) : null;
              return (
                <article key={entry.id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{entry.platform}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{formatEntryDate(entry.started_at)}</p>
                    </div>
                    {takeHome !== null && <div className="text-right"><p className="font-semibold tabular-nums">{formatCurrency(takeHome)}</p><p className="text-xs text-muted-foreground">take-home</p></div>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="size-3.5" />{durationHours(entry.started_at, entry.ended_at).toFixed(1)} hr</span>
                    <span className="inline-flex items-center gap-1.5"><Route aria-hidden="true" className="size-3.5" />{Number(entry.miles ?? 0).toFixed(1)} mi</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-3 border-y py-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Gross</dt><dd className="mt-1 font-medium tabular-nums">{formatCurrency(entry.gross_cents)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Tips</dt><dd className="mt-1 font-medium tabular-nums">{formatCurrency(entry.tips_cents)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Fuel</dt><dd className="mt-1 font-medium tabular-nums">{formatCurrency(entry.fuel_cost_cents)}</dd></div>
                  </dl>
                  {entry.notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{entry.notes}</p>}
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(entry)}><Pencil aria-hidden="true" className="size-4" />Edit</Button>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(entry.id)} disabled={busyId === entry.id}><Trash2 aria-hidden="true" className="size-4" />{busyId === entry.id ? "Deleting..." : "Delete"}</Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b text-xs text-muted-foreground"><tr>
                <th className="w-[21%] pb-3 text-left font-medium">Session</th><th className="w-[14%] pb-3 text-left font-medium">Work</th><th className="w-[16%] pb-3 text-right font-medium">Earnings</th><th className="w-[10%] pb-3 text-right font-medium">Fuel</th><th className="w-[15%] pb-3 text-right font-medium">Take-home</th><th className="w-[24%] pb-3 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => {
                  const takeHome = settings ? getEntryTakeHome(entry, settings) : null;
                  const date = formatEntryDate(entry.started_at);
                  return <tr key={entry.id}>
                    <td className="py-3 pr-3 align-top"><p className="font-medium">{entry.platform}</p><p className="mt-0.5 text-xs text-muted-foreground">{date}</p>{entry.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{entry.notes}</p>}</td>
                    <td className="py-3 pr-3 align-top text-muted-foreground"><p>{durationHours(entry.started_at, entry.ended_at).toFixed(1)} hr</p><p className="mt-0.5 text-xs">{Number(entry.miles ?? 0).toFixed(1)} mi</p></td>
                    <td className="py-3 pr-3 text-right align-top tabular-nums"><p className="font-medium">{formatCurrency(entry.gross_cents)}</p><p className="mt-0.5 text-xs text-muted-foreground">+{formatCurrency(entry.tips_cents)} tips</p></td>
                    <td className="py-3 pr-3 text-right align-top text-muted-foreground tabular-nums">{formatCurrency(entry.fuel_cost_cents)}</td>
                    <td className="py-3 pr-3 text-right align-top font-semibold tabular-nums">{takeHome === null ? "—" : formatCurrency(takeHome)}</td>
                    <td className="py-3 align-top"><div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" aria-label={`Edit ${entry.platform} entry from ${date}`} onClick={() => setEditing(entry)}><Pencil aria-hidden="true" className="size-4" />Edit</Button>
                      <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive" aria-label={`${busyId === entry.id ? "Deleting" : "Delete"} ${entry.platform} entry from ${date}`} onClick={() => onDelete(entry.id)} disabled={busyId === entry.id}><Trash2 aria-hidden="true" className="size-4" />{busyId === entry.id ? "Deleting..." : "Delete"}</Button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {editing && <EditEntryDialog entry={editing} onClose={() => setEditing(null)} onSaved={() => onChanged?.()} />}
    </section>
  );
}
