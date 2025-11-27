"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";
import EntryForm, {
  EntryFormInitial,
  localDateTimeInputValue,
} from "@/components/EntryForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
      const last: any = data?.[0];
      if (!last) {
        toast({ title: "No previous entry to duplicate" });
        return;
      }

      // Prefill with last entry's values; reset times to local "now"
      const nowLocal = localDateTimeInputValue();

      const safePlatform =
        last.platform === "Uber" ||
        last.platform === "Lyft" ||
        last.platform === "DoorDash" ||
        last.platform === "Instacart" ||
        last.platform === "AmazonFlex" ||
        last.platform === "Other"
          ? last.platform
          : "Uber";

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
    } catch (e: any) {
      toast({
        title: "Duplicate failed",
        description: e?.message ?? "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">New Entry</h1>
        <Button variant="outline" onClick={duplicateLast} disabled={busy}>
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
