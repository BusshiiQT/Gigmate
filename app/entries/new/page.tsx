"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";
import EntryForm, {
  EntryFormInitial,
} from "@/components/EntryForm";
import { localDateTimeInputValue } from "@/lib/datetime";
import { isPlatform } from "@/lib/validation";
import type { EntryRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy } from "lucide-react";

export default function NewEntryPage() {
  return (
    <AuthGate>
      <NewEntryClient />
    </AuthGate>
  );
}

function NewEntryClient() {
  const { toast } = useToast();
  const [initial, setInitial] = React.useState<EntryFormInitial | undefined>(
    undefined
  );
  const [busy, setBusy] = React.useState(false);

  const duplicateLast = async () => {
    try {
      setBusy(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not signed in" });
        return;
      }

      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      const last = data?.[0] as EntryRow | undefined;
      if (!last) {
        toast({ title: "No previous entry to duplicate" });
        return;
      }

      // Prefill with last entry's values; reset times to local "now"
      const nowLocal = localDateTimeInputValue();

      const safePlatform = isPlatform(last.platform) ? last.platform : "Uber";

      setInitial({
        platform: safePlatform,
        gross: ((last.gross_cents ?? 0) / 100).toFixed(2),
        tips: ((last.tips_cents ?? 0) / 100).toFixed(2),
        fuel_cost: ((last.fuel_cost_cents ?? 0) / 100).toFixed(2),
        miles: Number(last.miles ?? 0).toFixed(2),
        notes: last.notes ?? "",
        started_at: nowLocal,
        ended_at: nowLocal,
      });

      toast({ title: "Duplicated last entry" });
    } catch (e: unknown) {
      toast({
        title: "Duplicate failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New Entry</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log a new gig session.</p>
        </div>
        <Button className="self-start" variant="outline" size="sm" onClick={duplicateLast} disabled={busy}>
          <Copy aria-hidden="true" className="size-4" />
          {busy ? "Loading..." : "Duplicate last entry"}
        </Button>
      </div>

      <EntryForm
        initialValues={initial}
        onSaved={() => {
          // After save, redirect back to dashboard
          window.location.href = "/dashboard";
        }}
      />
    </main>
  );
}
