"use client";

import { formatCurrency } from "@/lib/utils";

export default function SummaryStrip({
  gross_cents,
  net_cents,
  hours,
}: {
  gross_cents: number;
  net_cents: number;
  hours: number;
}) {
  const items = [
    { label: "Total Income", value: formatCurrency(gross_cents) },
    { label: "Hours", value: hours.toFixed(2) },
    { label: "Profit (after est. expenses)", value: formatCurrency(net_cents) },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border bg-white p-4 dark:border-white/10 dark:bg-[#0f141a]"
        >
          <div className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300">
            {it.label}
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
