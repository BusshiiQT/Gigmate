"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import AuthGate from "@/components/AuthGate";
import type { SettingsRow } from "@/lib/types";

// Use coerce so number inputs (strings) become numbers
const schema = z.object({
  mileage_rate_cents: z.coerce.number().min(1, "Required"),
  tax_rate_bps: z.coerce.number().min(0, "Required"),
});

// IMPORTANT: RHF should use the schema's *input* type.
type FormValues = z.input<typeof schema>;

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsClient />
    </AuthGate>
  );
}

function SettingsClient() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // optional: set sensible defaults to avoid uncontrolled warnings
    defaultValues: {
      mileage_rate_cents: 67,
      tax_rate_bps: 1500,
    },
  });

  // Fetch settings
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast({ title: "Error loading settings", description: error.message });
      } else if (data) {
        setSettings(data as SettingsRow);
        // reset with numbers; z.coerce.number accepts strings too
        reset({
          mileage_rate_cents: data.mileage_rate_cents,
          tax_rate_bps: data.tax_rate_bps,
        });
      }
      setLoading(false);
    })();
  }, [reset, toast]);

  const onSubmit = async (values: FormValues) => {
    if (!settings) return;
    const { error } = await supabase
      .from("settings")
      .update({
        mileage_rate_cents: values.mileage_rate_cents,
        tax_rate_bps: values.tax_rate_bps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast({ title: "Save failed", description: error.message });
    } else {
      toast({ title: "Settings saved" });
      setSettings((s) => (s ? { ...s, ...values } as SettingsRow : s));
    }
  };

  if (loading) return <main className="p-4">Loading...</main>;

  return (
    <main className="mx-auto max-w-md p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Mileage rate (¢ per mile)
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2"
            {...register("mileage_rate_cents")}
          />
          {errors.mileage_rate_cents && (
            <p className="text-xs text-red-600 mt-1">
              {String(errors.mileage_rate_cents.message)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">
            Tax rate (basis points)
          </label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2"
            {...register("tax_rate_bps")}
          />
          <p className="text-xs text-gray-500 mt-1">Example: 1500 = 15%</p>
          {errors.tax_rate_bps && (
            <p className="text-xs text-red-600 mt-1">
              {String(errors.tax_rate_bps.message)}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </main>
  );
}
