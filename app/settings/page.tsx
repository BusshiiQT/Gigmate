"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Save, Shield } from "lucide-react";
import AuthGate from "@/components/AuthGate";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { settingsSchema } from "@/lib/validation";

type SettingsRow = { id: string; user_id: string; mileage_rate_cents: number; tax_rate_bps: number };

export default function SettingsPage() {
  return <AuthGate><SettingsClient /></AuthGate>;
}

function SettingsClient() {
  const { toast } = useToast();
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mileageRate, setMileageRate] = useState("67");
  const [taxRate, setTaxRate] = useState("15.00");
  const [errors, setErrors] = useState<{ mileageRate?: string; taxRate?: string }>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle();
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
      setErrors({ mileageRate: fields.mileageRate?.[0], taxRate: fields.taxRate?.[0] });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const mileage_rate_cents = Math.round(Number(result.data.mileageRate) * 100);
      const tax_rate_bps = Math.round(Number(result.data.taxRate) * 100);
      const { error } = await supabase.from("settings").update({ mileage_rate_cents, tax_rate_bps }).eq("id", row.id);
      if (error) toast({ title: "Save failed", description: error.message });
      else toast({ title: "Settings saved" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Manage how GigMate estimates your earnings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Financial assumptions</CardTitle>
          <CardDescription>These values help GigMate estimate deductions, taxes, and take-home pay.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground" role="status">Loading settings…</p> : (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <SettingField id="mileage-rate" label="Mileage rate" description="Used to estimate your mileage tax deduction." value={mileageRate} setValue={setMileageRate} error={errors.mileageRate} prefix="$" suffix="/ mile" />
                <SettingField id="tax-rate" label="Tax reserve" description="Percentage of estimated taxable profit you want to set aside for taxes." value={taxRate} setValue={setTaxRate} error={errors.taxRate} suffix="%" />
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={save} disabled={saving || !row}>
                  <Save className="size-4" aria-hidden="true" />
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose the interface that works best for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <div><p className="text-sm font-medium">Theme</p><p className="text-xs text-muted-foreground">Light / Dark</p></div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Help &amp; legal</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <LegalLink href="/privacy" label="Privacy Policy" icon={Shield} />
          <LegalLink href="/terms" label="Terms of Service" icon={FileText} />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingField({ id, label, description, value, setValue, error, prefix, suffix }: { id: string; label: string; description: string; value: string; setValue: (value: string) => void; error?: string; prefix?: string; suffix: string }) {
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p id={`${id}-description`} className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">{prefix}</span>}
        <Input id={id} type="number" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className={`${prefix ? "pl-7" : ""} ${suffix === "/ mile" ? "pr-16" : "pr-9"}`} aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`} aria-invalid={Boolean(error)} />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground" aria-hidden="true">{suffix}</span>
      </div>
      {error && <p id={`${id}-error`} className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function LegalLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Shield }) {
  return (
    <Link href={href} className="group flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" /><span className="flex-1">{label}</span><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
