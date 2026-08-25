// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PatternInsights from "@/components/PatternInsights";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import AuthGate from "@/components/AuthGate";
import EntriesTable from "@/components/EntriesTable";
import StatsCards from "@/components/StatsCards";
import WeeklyNetChart, {
  ChartMode,
  type ChartEntry,
} from "@/components/WeeklyNetChart";
import InsightsPanel, {
  type InsightEntry,
} from "@/components/InsightsPanel";
import { DashboardSkeleton } from "@/components/SkeletonBlocks";

import type { EntryRow, SettingsRow } from "@/lib/types";
import { aggregateCalculations, calculateEntry } from "@/lib/finance";
import {
  getLocalMonthRange,
  getLocalWeekRange,
  getWeekRangeUtc,
} from "@/lib/datetime";

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
  const [analyticalEntries, setAnalyticalEntries] = useState<InsightEntry[]>(
    []
  );
  const [chartEntries, setChartEntries] = useState<ChartEntry[]>([]);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [chartUnavailable, setChartUnavailable] = useState(false);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("week");
  const [chartMode, setChartMode] = useState<ChartMode>("day");
  const [exporting, setExporting] = useState(false);

  const weekRange = useMemo(() => getWeekRangeUtc(new Date()), []);
  const boundedDataRange = useMemo(() => {
    const now = new Date();
    const firstChartWeek = getLocalWeekRange(now, -7);
    const currentWeek = getLocalWeekRange(now);
    const firstChartMonth = getLocalMonthRange(now, -11);
    const currentMonth = getLocalMonthRange(now);

    return {
      startInclusiveIso: new Date(
        Math.min(
          firstChartWeek.startInclusive.getTime(),
          firstChartMonth.startInclusive.getTime()
        )
      ).toISOString(),
      endExclusiveIso: new Date(
        Math.max(
          currentWeek.endExclusive.getTime(),
          currentMonth.endExclusive.getTime()
        )
      ).toISOString(),
    };
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setAnalyticsUnavailable(false);
    setChartUnavailable(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEntries([]);
      setAnalyticalEntries([]);
      setChartEntries([]);
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
        .gte("started_at", weekRange.startInclusiveIso)
        .lt("started_at", weekRange.endExclusiveIso);
    }

    const { data, error } = await query;
    const displayEntries = (data ?? []) as EntryRow[];

    if (error) {
      toast({ title: "Error loading entries", description: error.message });
      setEntries([]);
    } else {
      setEntries(displayEntries);
    }

    if (scope === "all") {
      if (error) {
        setAnalyticalEntries([]);
        setChartEntries([]);
        setAnalyticsUnavailable(true);
        setChartUnavailable(true);
      } else {
        setAnalyticalEntries(displayEntries);
        setChartEntries(displayEntries);
      }
    } else {
      const { data: boundedData, error: boundedDataError } = await supabase
        .from("entries")
        .select(
          "platform, started_at, ended_at, gross_cents, tips_cents, miles, fuel_cost_cents"
        )
        .eq("user_id", user.id)
        .gte("started_at", boundedDataRange.startInclusiveIso)
        .lt("started_at", boundedDataRange.endExclusiveIso);

      if (boundedDataError) {
        toast({
          title: "Chart and insights unavailable",
          description: boundedDataError.message,
        });
        setAnalyticalEntries([]);
        setChartEntries([]);
        setAnalyticsUnavailable(true);
        setChartUnavailable(true);
      } else {
        const sharedEntries = (boundedData ?? []) as InsightEntry[];
        setAnalyticalEntries(sharedEntries);
        setChartEntries(sharedEntries);
      }
    }

    setLoading(false);
  }, [
    scope,
    boundedDataRange.startInclusiveIso,
    boundedDataRange.endExclusiveIso,
    weekRange.startInclusiveIso,
    weekRange.endExclusiveIso,
    toast,
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => {
    if (!settings) {
      return aggregateCalculations([]);
    }

    const calculations = entries.map((entry) =>
      calculateEntry({
        grossCents: entry.gross_cents,
        tipsCents: entry.tips_cents,
        fuelCostCents: entry.fuel_cost_cents,
        miles: Number(entry.miles),
        mileageRateCents: settings.mileage_rate_cents,
        taxRateBps: settings.tax_rate_bps,
        startedAtMilliseconds: new Date(entry.started_at).getTime(),
        endedAtMilliseconds: new Date(entry.ended_at).getTime(),
      })
    );

    return aggregateCalculations(calculations);
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
        } catch {}
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
    setChartMode(next === "week" ? "day" : "week");
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-4 pb-8 sm:p-6 md:p-8">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Header */}
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
              <Link href="/screenshots">
                <Button variant="outline">Screenshots</Button>
              </Link>
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

          {/* Empty */}
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-slate-100/90 p-10 text-center text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <div className="mb-3 text-4xl">🚗</div>
              <p className="font-medium">No entries yet</p>
              <p className="mt-1 text-sm">
                Start by adding your first shift or batch. We'll crunch the
                numbers for you.
              </p>
              <Link href="/entries/new" className="mt-4">
                <Button size="sm">Add your first entry</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Stats summary */}
              {settings && (
                <StatsCards
                  totalEarningsCents={stats.totalEarningsCents}
                  cashProfitCents={stats.cashProfitCents}
                  mileageDeductionCents={stats.mileageDeductionCents}
                  estimatedTaxReserveCents={stats.estimatedTaxReserveCents}
                  estimatedTakeHomeCents={stats.estimatedTakeHomeCents}
                  estimatedHourlyRateCents={stats.estimatedHourlyRateCents}
                />
              )}

              {/* Chart */}
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
                    chartEntries={chartEntries}
                    unavailable={chartUnavailable}
                    settings={settings}
                    mode={chartMode}
                  />
                </>
              )}

              {/* Insights */}
              <InsightsPanel
                displayEntries={entries}
                analyticalEntries={analyticalEntries}
                analyticsUnavailable={analyticsUnavailable}
                settings={settings}
                scope={scope}
              />

              {/* Pattern Insights */}
              <PatternInsights
                patternEntries={analyticalEntries}
                unavailable={analyticsUnavailable}
                settings={settings}
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
