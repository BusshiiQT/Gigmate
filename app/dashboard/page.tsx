// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays, startOfWeek } from "date-fns";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import AuthGate from "@/components/AuthGate";
import EntriesTable from "@/components/EntriesTable";
import StatsCards from "@/components/StatsCards";
import WeeklyNetChart, { ChartMode } from "@/components/WeeklyNetChart";
import InsightsPanel from "@/components/InsightsPanel";
import { DashboardSkeleton } from "@/components/SkeletonBlocks";

import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  durationHours,
  mileageDeductionCents,
  taxEstimateCents,
  netProfitCents,
} from "@/lib/utils";

type Scope = "week" | "all";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardClient />
    </AuthGate>
  );
}

function DashboardClient() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("week");
  const [chartMode, setChartMode] = useState<ChartMode>("day");
  const [exporting, setExporting] = useState(false);

  // Current week (Mon–Sun) range in ISO
  const weekRange = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = addDays(weekStart, 7);
    weekEnd.setHours(23, 59, 59, 999);
    return {
      startISO: weekStart.toISOString(),
      endISO: weekEnd.toISOString(),
    };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEntries([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    // settings
    const { data: settingsData, error: settingsErr } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsErr) {
      toast({
        title: "Error loading settings",
        description: settingsErr.message,
      });
    }

    setSettings((settingsData ?? null) as SettingsRow | null);

    // entries
    let query = supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (scope === "week") {
      query = query
        .lte("started_at", weekRange.endISO)
        .gte("ended_at", weekRange.startISO);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error loading entries", description: error.message });
      setEntries([]);
    } else {
      setEntries((data ?? []) as EntryRow[]);
    }

    setLoading(false);
  }, [scope, weekRange.startISO, weekRange.endISO, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => {
    if (!settings) {
      return { gross: 0, fuel: 0, tax: 0, net: 0, hours: 0 };
    }

    const gross = entries.reduce((s, e) => s + e.gross_cents, 0);
    const fuel = entries.reduce((s, e) => s + e.fuel_cost_cents, 0);
    const miles = entries.reduce((s, e) => s + Number(e.miles || 0), 0);
    const hours = entries.reduce(
      (s, e) => s + durationHours(e.started_at, e.ended_at),
      0
    );

    const mileageDeduction = mileageDeductionCents(
      miles,
      settings.mileage_rate_cents
    );
    const tax = taxEstimateCents(
      gross,
      mileageDeduction,
      fuel,
      settings.tax_rate_bps
    );
    const net = netProfitCents(gross, fuel, tax);

    return { gross, fuel, tax, net, hours };
  }, [entries, settings]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch("/api/export");
      const text = await res.text();

      if (!res.ok) {
        let msg = "Export failed";
        try {
          const parsed = JSON.parse(text);
          msg = parsed?.error || msg;
        } catch {
          // non-JSON
        }
        throw new Error(msg);
      }

      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gigmate-entries-${new Date()
        .toISOString()
        .split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "CSV exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message });
    } finally {
      setExporting(false);
    }
  };

  const handleScopeChange = (next: Scope) => {
    setScope(next);
    // When looking at just this week, show daily buckets.
    // For "all entries", show weekly by default.
    setChartMode(next === "week" ? "day" : "week");
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-4 pb-8 sm:p-6 md:p-8">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Track your true profit across platforms and weeks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant={scope === "week" ? "default" : "outline"}
                onClick={() => handleScopeChange("week")}
              >
                This week
              </Button>
              <Button
                variant={scope === "all" ? "default" : "outline"}
                onClick={() => handleScopeChange("all")}
              >
                All entries
              </Button>
              <Link href="/entries/new">
                <Button>+ New Entry</Button>
              </Link>
            </div>
          </div>

          {/* Empty state */}
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-slate-100/90 p-10 text-center text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <div className="mb-3 text-4xl">🚗</div>
              <p className="font-medium">No entries yet</p>
              <p className="mt-1 text-sm">
                Start by adding your first shift or batch. We&apos;ll crunch the
                numbers for you.
              </p>
              <Link href="/entries/new" className="mt-4">
                <Button size="sm">Add your first entry</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              {settings && (
                <StatsCards
                  gross_cents={stats.gross}
                  expenses_cents={stats.fuel + stats.tax}
                  net_cents={stats.net}
                  hours={stats.hours}
                />
              )}

              {/* Chart + controls */}
              {settings && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Profit trend
                    </p>
                    <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-800">
                      <button
                        className={`rounded-full px-3 py-1 ${
                          chartMode === "day"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                        onClick={() => setChartMode("day")}
                      >
                        Daily
                      </button>
                      <button
                        className={`rounded-full px-3 py-1 ${
                          chartMode === "week"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                        onClick={() => setChartMode("week")}
                      >
                        Weekly
                      </button>
                      <button
                        className={`rounded-full px-3 py-1 ${
                          chartMode === "month"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                        onClick={() => setChartMode("month")}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  <WeeklyNetChart
                    entries={entries}
                    settings={settings}
                    mode={chartMode}
                  />
                </>
              )}

              {/* Insights */}
              <InsightsPanel
                entries={entries}
                settings={settings}
                scope={scope}
              />

              {/* Table */}
              <EntriesTable entries={entries} onChanged={fetchAll} />
            </>
          )}
        </>
      )}
    </main>
  );
}
