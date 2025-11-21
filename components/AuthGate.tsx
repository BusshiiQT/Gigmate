"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setAuthed(true);
      } else {
        router.replace("/signin");
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session) {
          setAuthed(true);
        } else {
          setAuthed(false);
          router.replace("/signin");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <div className="p-6 text-center">Loading…</div>;
  }

  if (!authed) return null;

  return <>{children}</>;
}
