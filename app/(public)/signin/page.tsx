"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const modeParam = (search.get("mode") || "signin").toLowerCase();
  const defaultTab = useMemo(() => (modeParam === "signup" ? "signup" : "signin"), [modeParam]);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<"signin" | "signup" | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const redirectIfAuthenticated = (session: unknown) => { if (session) router.replace("/dashboard"); };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      redirectIfAuthenticated(session);
      if (!session) setChecking(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      redirectIfAuthenticated(session);
    });
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, [router]);

  const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "";
  const sendOtp = async (kind: "signin" | "signup") => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } });
    if (error) alert(error.message);
    else setSent(kind);
  };
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl } });
    if (error) alert(error.message);
  };

  if (checking) return <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center" role="status"><p className="text-sm text-muted-foreground">Loading…</p></div>;

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-6">
        <Card className="w-full max-w-[440px]">
          <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-8">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-6" aria-hidden="true" /></span>
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">We sent a link to <span className="font-medium text-foreground">{email}</span> to {sent === "signup" ? "create your account" : "sign in"}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Click the link to continue to your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-6">
      <Card className="w-full max-w-[440px]">
        <CardHeader className="items-center px-6 pb-2 pt-7 text-center sm:px-8">
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="size-5" aria-hidden="true" /></span>
          <CardTitle className="text-2xl">Welcome to GigMate</CardTitle>
          <CardDescription>Track what you actually take home.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-7 pt-4 sm:px-8">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="signin" className="rounded-md focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-md focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs">Create account</TabsTrigger>
            </TabsList>
            <AuthTab value="signin" email={email} setEmail={setEmail} onMagicLink={() => sendOtp("signin")} onGoogle={handleGoogle} action="Send sign-in link" />
            <AuthTab value="signup" email={email} setEmail={setEmail} onMagicLink={() => sendOtp("signup")} onGoogle={handleGoogle} action="Send create-account link" />
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthTab({ value, email, setEmail, onMagicLink, onGoogle, action }: { value: string; email: string; setEmail: (value: string) => void; onMagicLink: () => void; onGoogle: () => void; action: string }) {
  const fieldId = `${value}-email`;
  return (
    <TabsContent value={value} className="mt-5 focus-visible:ring-ring">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor={fieldId} className="text-sm font-medium">Email address</label>
          <Input id={fieldId} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Button className="w-full" onClick={onMagicLink} disabled={!email}>{action}</Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">We&apos;ll email you a secure sign-in link. No password required.</p>
        </div>
        <div className="flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or</span><span className="h-px flex-1 bg-border" /></div>
        <Button variant="outline" className="w-full" onClick={onGoogle}>Continue with Google</Button>
      </div>
    </TabsContent>
  );
}
