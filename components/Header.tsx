"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Zap } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

  const isCurrent = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const navClassName = (href: string) =>
    isCurrent(href)
      ? "bg-accent text-accent-foreground shadow-xs"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground";

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-colors group-hover:bg-primary/90">
            <Zap aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">
            GigMate
          </span>
        </Link>

        <nav
          className="ml-3 hidden items-center gap-1 border-l border-border/80 pl-4 text-sm sm:flex"
          aria-label="Primary navigation"
        >
          <Link
            href="/dashboard"
            aria-current={isCurrent("/dashboard") ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${navClassName("/dashboard")}`}
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            aria-current={isCurrent("/settings") ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${navClassName("/settings")}`}
          >
            Settings
          </Link>
          <Link
            href="/about"
            aria-current={isCurrent("/about") ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${navClassName("/about")}`}
          >
            About
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 border-l border-border/80 pl-3">
          <ThemeToggle />
          {email ? (
            <>
              <span className="hidden max-w-36 truncate text-xs font-medium text-muted-foreground lg:block">
                {email}
              </span>
              <Button onClick={signOut} variant="outline" size="sm" className="px-2.5 sm:px-3">
                <span className="sm:hidden">Out</span>
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm" className="px-2.5 sm:px-3">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
