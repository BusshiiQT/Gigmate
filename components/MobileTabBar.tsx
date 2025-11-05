"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileTabBar() {
  const pathname = usePathname();
  const tabs = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠" },
    { href: "/entries/new", label: "New", icon: "➕" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  // Hide on screens ≥ sm (mobile-only)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center py-3 text-xs ${
                  active ? "text-sky-600" : "text-gray-600"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {t.icon}
                </span>
                <span className="mt-1">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
