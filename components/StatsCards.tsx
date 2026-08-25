// components/StatsCards.tsx
"use client";

import { formatCurrency } from "@/lib/utils";

type StatsCardsProps = {
  totalEarningsCents: number;
  cashProfitCents: number;
  mileageDeductionCents: number;
  estimatedTaxReserveCents: number;
  estimatedTakeHomeCents: number;
  estimatedHourlyRateCents: number;
};

export default function StatsCards({
  totalEarningsCents,
  cashProfitCents,
  mileageDeductionCents,
  estimatedTaxReserveCents,
  estimatedTakeHomeCents,
  estimatedHourlyRateCents,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Total earnings",
      value: formatCurrency(totalEarningsCents),
    },
    { label: "Cash profit", value: formatCurrency(cashProfitCents) },
    {
      label: "Mileage deduction",
      value: formatCurrency(mileageDeductionCents),
    },
    {
      label: "Estimated tax reserve",
      value: formatCurrency(estimatedTaxReserveCents),
    },
    {
      label: "Estimated take-home",
      value: formatCurrency(estimatedTakeHomeCents),
    },
    {
      label: "Effective hourly rate",
      value: formatCurrency(estimatedHourlyRateCents),
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
