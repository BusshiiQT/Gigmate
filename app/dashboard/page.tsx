"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import AuthGate from "@/components/AuthGate";
import EntriesTable from "@/components/EntriesTable";
import StatsCards from "@/components/StatsCards";
import type { EntryRow, SettingsRow } from "@/lib/types";
import {
  durationHours,
  mileageDeductionCents,
  taxEstimateCents,
  netProfitCents,
} from "@/lib/utils";
import { addDays, startOfWeek } from "date-fns";
import { DashboardSkeleton } from "@/components/SkeletonBlocks";
import WeeklyNetChart from "@/components/WeeklyNetChart";
import EmptyState from "@/components/EmptyState";

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
  const [scope, setScope] = useState<"week" | "all">("week");
  const [exporting, setExporting] = useState(false);

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
  }, [scope, weekRange.endISO, weekRange.startISO, toast]);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No access token");

      const res = await fetch("/api/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();

      if (!res.ok) {
        let msg = text;
        try {
          const parsed = JSON.parse(text);
          msg = parsed?.error || text;
        } catch {}
        throw new Error(msg);
      }

      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gigmate-entries-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "CSV exported" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message || "" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-4 space-y-6">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant={scope === "week" ? "default" : "outline"}
                onClick={() => setScope("week")}
              >
                This week
              </Button>
              <Button
                variant={scope === "all" ? "default" : "outline"}
                onClick={() => setScope("all")}
              >
                All entries
              </Button>
              <Link href="/entries/new">
                <Button>+ New Entry</Button>
              </Link>
            </div>
          </div>

          {entries.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title="No entries yet"
              hint={
                <>
                  Start by adding your first shift entry. You’ll see weekly net profit,
                  mileage deduction, and effective hourly here.
                </>
              }
              cta={
                <Link href="/entries/new">
                  <Button>+ Add your first entry</Button>
                </Link>
              }
            />
          ) : (
            <>
              {settings && (
                <StatsCards
                  gross_cents={stats.gross}
                  expenses_cents={stats.fuel + stats.tax}
                  net_cents={stats.net}
                  hours={stats.hours}
                />
              )}
              {settings && <WeeklyNetChart entries={entries} settings={settings} />}
              <EntriesTable entries={entries} onChanged={fetchAll} />
            </>
          )}
        </>
      )}
    </main>
  );
}
