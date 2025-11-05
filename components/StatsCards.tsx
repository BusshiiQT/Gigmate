"use client";

import { formatCurrency, effectiveHourlyRateCents } from "@/lib/utils";

export default function StatsCards(props: {
  gross_cents: number;
  expenses_cents: number; // tax + fuel + mileage deduction if you choose (for now: fuel + tax)
  net_cents: number;
  hours: number;
}) {
  const hourly = effectiveHourlyRateCents(props.net_cents, props.hours);

  const Item = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Item label="Gross" value={formatCurrency(props.gross_cents)} />
      <Item label="Est. Expenses" value={formatCurrency(props.expenses_cents)} />
      <Item label="Net Profit" value={formatCurrency(props.net_cents)} />
      <Item label="Effective Hourly" value={formatCurrency(hourly)} />
    </div>
  );
}
