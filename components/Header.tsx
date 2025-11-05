"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  const isActive = (href: string) =>
    pathname === href
      ? "text-gray-900 dark:text-white font-medium"
      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white";

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0b0f14]/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500 text-white">
            ⚡
          </div>
          <span className="font-semibold tracking-tight dark:text-white">GigMate</span>
        </Link>

        <nav className="hidden gap-6 text-sm sm:flex">
          <Link href="/dashboard" className={isActive("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/settings" className={isActive("/settings")}>
            Settings
          </Link>
          <Link href="/about" className={isActive("/about")}>
            About
          </Link>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <ThemeToggle />
          {email ? (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-300">{email}</span>
              <Button onClick={signOut} variant="outline" size="sm">
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/signin">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
