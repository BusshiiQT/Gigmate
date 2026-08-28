"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, LayoutDashboard, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entries/new", label: "New entry", icon: CirclePlus },
  { href: "/settings", label: "Settings", icon: Settings },
];

const applicationRoutes = ["/dashboard", "/entries", "/settings"];

export default function MobileTabBar() {
  const pathname = usePathname();
  const isApplicationRoute = applicationRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isApplicationRoute) return null;

  // Hide on screens ≥ sm (mobile-only)
  return (
    <nav
      aria-label="Application navigation"
      className="mobile-app-nav fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 shadow-[0_-8px_24px_-18px_oklch(0.2_0.04_252/0.35)] backdrop-blur supports-[backdrop-filter]:bg-card/90 sm:hidden"
    >
      <ul className="mx-auto flex h-[calc(4rem+env(safe-area-inset-bottom))] max-w-xl items-stretch px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const active =
            pathname === t.href ||
            (t.href === "/dashboard" && pathname.startsWith("/dashboard/")) ||
            (t.href === "/entries/new" && pathname.startsWith("/entries/")) ||
            (t.href === "/settings" && pathname.startsWith("/settings/"));
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`mx-1 flex h-full min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  active
                    ? "bg-accent/80 text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.8}
                />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
