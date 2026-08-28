// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Camera,
  Download,
  Fuel,
  Landmark,
  Plus,
  Route,
} from "lucide-react";
import PatternInsights from "@/components/PatternInsights";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import AuthGate from "@/components/AuthGate";
import EntriesTable from "@/components/EntriesTable";
import EmptyState from "@/components/EmptyState";
import StatsCards from "@/components/StatsCards";
import WeeklyNetChart, {
  ChartMode,
  type ChartEntry,
} from "@/components/WeeklyNetChart";
import InsightsPanel, {
  type InsightEntry,
} from "@/components/InsightsPanel";
import { DashboardSkeleton } from "@/components/SkeletonBlocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

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
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const res = await fetch("/api/export", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const text = await res.text();

      if (!res.ok) {
        let msg = "Export failed";
        try {
          const parsed: unknown = JSON.parse(text);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "error" in parsed &&
            typeof parsed.error === "string"
          ) {
            msg = parsed.error;
          }
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
    } catch (error: unknown) {
      const description =
        error instanceof Error
          ? error.message
          : "Something went wrong while exporting your entries.";
      toast({ title: "Export failed", description });
    } finally {
      setExporting(false);
    }
  };

  const handleScopeChange = (next: Scope) => {
    setScope(next);
    setChartMode(next === "week" ? "day" : "week");
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-4 pb-24 sm:gap-6 sm:p-6 sm:pb-8 md:p-8">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Your earnings command center.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  <Download aria-hidden="true" className="size-4" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </Button>
                <Link href="/screenshots">
                  <Button variant="ghost">
                    <Camera aria-hidden="true" className="size-4" />
                    Screenshots
                  </Button>
                </Link>
                <Link href="/entries/new">
                  <Button>
                    <Plus aria-hidden="true" className="size-4" />
                    New Entry
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t pt-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                View
              </span>
              <div
                className="inline-flex rounded-lg border bg-slate-50 p-1 dark:bg-slate-900"
                role="group"
                aria-label="Dashboard scope"
              >
                <button
                  type="button"
                  aria-pressed={scope === "week"}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    scope === "week"
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  }`}
                  onClick={() => handleScopeChange("week")}
                >
                  This week
                </button>
                <button
                  type="button"
                  aria-pressed={scope === "all"}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    scope === "all"
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  }`}
                  onClick={() => handleScopeChange("all")}
                >
                  All entries
                </button>
              </div>
            </div>
          </div>

          {/* Empty */}
          {entries.length === 0 ? (
            <EmptyState
              title="No earnings yet"
              hint="Add your first gig session to see your true take-home, hourly rate, tax reserve, and profit trends."
              cta={
                <Link href="/entries/new">
                  <Button>
                    <Plus aria-hidden="true" className="size-4" />
                    Add your first entry
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              {/* Stats summary */}
              {settings && (
                <StatsCards
                  scopeLabel={scope === "week" ? "This week" : "All entries"}
                  totalEarningsCents={stats.totalEarningsCents}
                  cashProfitCents={stats.cashProfitCents}
                  estimatedTaxReserveCents={stats.estimatedTaxReserveCents}
                  estimatedTakeHomeCents={stats.estimatedTakeHomeCents}
                  estimatedHourlyRateCents={stats.estimatedHourlyRateCents}
                  workedHours={stats.workedHours}
                />
              )}

              {/* Analytics */}
              {settings && (
                <section
                  aria-labelledby="analytics-heading"
                  className="space-y-3"
                >
                  <h2 id="analytics-heading" className="sr-only">
                    Analytics
                  </h2>
                  <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
                    <WeeklyNetChart
                      chartEntries={chartEntries}
                      unavailable={chartUnavailable}
                      settings={settings}
                      mode={chartMode}
                      onModeChange={setChartMode}
                    />
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle>Financial breakdown</CardTitle>
                        <CardDescription>
                          How your take-home estimate is built.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="divide-y divide-border">
                        {[
                          {
                            label: "Fuel cost",
                            value: `-${formatCurrency(stats.fuelCostCents)}`,
                            note: "Actual cash expense",
                            Icon: Fuel,
                            tone: "text-foreground",
                          },
                          {
                            label: "Mileage deduction",
                            value: formatCurrency(stats.mileageDeductionCents),
                            note: "Tax deduction, not cash spent",
                            Icon: Route,
                            tone: "text-blue-700 dark:text-blue-300",
                          },
                          {
                            label: "Estimated taxable profit",
                            value: formatCurrency(
                              stats.estimatedTaxableProfitCents
                            ),
                            note: "Intermediate tax estimate",
                            Icon: Calculator,
                            tone: "text-foreground",
                          },
                          {
                            label: "Tax reserve",
                            value: `-${formatCurrency(
                              stats.estimatedTaxReserveCents
                            )}`,
                            note: "Set aside for estimated taxes",
                            Icon: Landmark,
                            tone: "text-foreground",
                          },
                        ].map(({ label, value, note, Icon, tone }) => (
                          <div
                            key={label}
                            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <span className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <p className="text-sm font-medium">{label}</p>
                                <p
                                  className={`font-semibold tabular-nums ${tone}`}
                                >
                                  {value}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </section>
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
              <EntriesTable
                entries={entries}
                settings={settings}
                onChanged={fetchAll}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
