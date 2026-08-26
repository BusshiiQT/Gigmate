"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsSchema } from "@/lib/validation";

type SettingsRow = {
  id: string;
  user_id: string;
  mileage_rate_cents: number;
  tax_rate_bps: number;
};

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsClient />
    </AuthGate>
  );
}

function SettingsClient() {
  const { toast } = useToast();
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mileageRate, setMileageRate] = useState<string>("67");
  const [taxRate, setTaxRate] = useState<string>("15.00");
  const [errors, setErrors] = useState<{
    mileageRate?: string;
    taxRate?: string;
  }>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) toast({ title: "Load failed", description: error.message });
      if (data) {
        setRow(data as SettingsRow);
        setMileageRate(String((data.mileage_rate_cents / 100).toFixed(2)));
        setTaxRate(String((data.tax_rate_bps / 100).toFixed(2)));
      }
      setLoading(false);
    })();
  }, [toast]);

  const save = async () => {
    if (!row || saving) return;
    const result = settingsSchema.safeParse({ mileageRate, taxRate });
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({
        mileageRate: fields.mileageRate?.[0],
        taxRate: fields.taxRate?.[0],
      });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const mileage_rate_cents = Math.round(Number(result.data.mileageRate) * 100);
      const tax_rate_bps = Math.round(Number(result.data.taxRate) * 100);

      const { error } = await supabase
        .from("settings")
        .update({ mileage_rate_cents, tax_rate_bps })
        .eq("id", row.id);

      if (error) toast({ title: "Save failed", description: error.message });
      else toast({ title: "Settings saved" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card space-y-4">
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300">
                  Mileage rate ($/mile)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={mileageRate}
                  onChange={(e) => setMileageRate(e.target.value)}
                />
                {errors.mileageRate && (
                  <p className="mt-1 text-xs text-red-500">{errors.mileageRate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300">
                  Tax rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
                {errors.taxRate && (
                  <p className="mt-1 text-xs text-red-500">{errors.taxRate}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Help & Legal */}
      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">Help & Legal</h2>
        <ul className="list-inside list-disc text-gray-700 dark:text-gray-200">
          <li>
            <Link href="/privacy" className="text-sky-600 hover:underline">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-sky-600 hover:underline">
              Terms of Service
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
