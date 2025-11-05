"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const modeParam = (search.get("mode") || "signin").toLowerCase();
  const defaultTab = useMemo(
    () => (modeParam === "signup" ? "signup" : "signin"),
    [modeParam]
  );

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<"signin" | "signup" | null>(null);
  const [checking, setChecking] = useState(true);
  const errorMsg = search.get("error");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setChecking(false);
    });
  }, [router]);

  // IMPORTANT: route back through /auth/callback so the server sets cookies
  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/dashboard`;

  const sendOtp = async (kind: "signin" | "signup") => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });
    if (error) {
      alert(error.message);
    } else {
      setSent(kind);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) alert(error.message);
  };

  if (checking) return <div className="p-6 text-center">Loading…</div>;

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">
            ✅ Check your email to {sent === "signup" ? "create your account" : "sign in"}.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Click the link to continue to your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to GigMate</h1>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <div className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />
              <Button onClick={() => sendOtp("signin")} disabled={!email}>
                Send sign-in link
              </Button>
              <div className="text-center text-sm text-gray-500">or</div>
              <Button variant="outline" onClick={handleGoogle}>
                Continue with Google
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <div className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />
              <Button onClick={() => sendOtp("signup")} disabled={!email}>
                Send create-account link
              </Button>
              <div className="text-center text-sm text-gray-500">or</div>
              <Button variant="outline" onClick={handleGoogle}>
                Continue with Google
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                We use passwordless login. You’ll receive a secure link to finish creating your account.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
