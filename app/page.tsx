"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function LandingPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(Boolean(session));
    });
  }, []);

  const join = async () => {
    if (!email) return;
    try {
      setBusy(true);
      // 🔹 Only call our server route; do not insert to Supabase from the client.
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      toast({
        title: "Thanks!",
        description: data?.emailed
          ? "You’re on the list. Check your inbox."
          : `You’re on the list. (Email didn’t send${data?.note ? `: ${data.note}` : ""}.)`,
      });
      setEmail("");
    } catch (e: any) {
      toast({ title: "Couldn’t add email", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
      <section className="grid items-center gap-6 rounded-3xl border bg-white p-6 dark:border-white/10 dark:bg-[#0f141a] sm:grid-cols-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            See your <span className="text-sky-600">true profit</span>, not just gross.
          </h1>
          <p className="mt-3 text-gray-700 dark:text-gray-200">
            Gig apps show what you made—GigMate shows what you keep. Track mileage deduction,
            fuel, taxes, and your actual hourly.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {authed ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/signin">
                <Button>Sign in</Button>
              </Link>
            )}
            <div className="flex w-full max-w-md items-center gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button variant="outline" onClick={join} disabled={busy || !email}>
                {busy ? "Joining…" : "Join waitlist"}
              </Button>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            We’ll only use your email to share updates. You can export or delete data anytime.
          </p>
        </div>

        <div className="hidden sm:block">
          <div className="rounded-2xl border bg-white p-6 text-gray-700 dark:border-white/10 dark:bg-[#0f141a] dark:text-gray-200">
            <ul className="list-inside list-disc space-y-2">
              <li>Track earnings across Uber, Lyft, DoorDash, Instacart, and more.</li>
              <li>Mileage & fuel costs included automatically.</li>
              <li>See net profit and effective hourly at a glance.</li>
              <li>Export to CSV, mobile-first UI.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Fast Entry", "Add shifts in seconds with smart defaults."],
          ["Clear Insights", "Weekly profit and best day highlights."],
          ["Own Your Data", "Secure by design with row-level security."],
        ].map(([title, body]) => (
          <div
            key={title}
            className="rounded-2xl border bg-white p-6 dark:border-white/10 dark:bg-[#0f141a]"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-200">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
