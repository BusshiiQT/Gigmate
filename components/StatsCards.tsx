// components/StatsCards.tsx
"use client";

import { formatCurrency } from "@/lib/utils";

type StatsCardsProps = {
  gross_cents: number;
  expenses_cents: number;
  net_cents: number;
  hours: number;
};

export default function StatsCards({
  gross_cents,
  expenses_cents,
  net_cents,
  hours,
}: StatsCardsProps) {
  const cards = [
    { label: "Gross", value: formatCurrency(gross_cents) },
    { label: "Est. Expenses", value: formatCurrency(expenses_cents) },
    { label: "Net Profit", value: formatCurrency(net_cents) },
    {
      label: "Effective Hourly",
      value:
        hours > 0 ? formatCurrency(Math.round(net_cents / hours)) : "$0.00",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-3xl border bg-slate-100/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {c.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
            {c.value}
          </p>
        </div>
      ))}
    </section>
  );
}
