// components/StatsCards.tsx
"use client";

import {
  CircleDollarSign,
  Landmark,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type StatsCardsProps = {
  scopeLabel: string;
  totalEarningsCents: number;
  cashProfitCents: number;
  estimatedTaxReserveCents: number;
  estimatedTakeHomeCents: number;
  estimatedHourlyRateCents: number;
  workedHours: number;
};

export default function StatsCards({
  scopeLabel,
  totalEarningsCents,
  cashProfitCents,
  estimatedTaxReserveCents,
  estimatedTakeHomeCents,
  estimatedHourlyRateCents,
  workedHours,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Total earnings",
      value: formatCurrency(totalEarningsCents),
      description: "Gross earnings and tips",
      icon: CircleDollarSign,
    },
    {
      label: "Cash profit",
      value: formatCurrency(cashProfitCents),
      description: "Earnings after fuel costs",
      icon: TrendingUp,
    },
    {
      label: "Estimated tax reserve",
      value: formatCurrency(estimatedTaxReserveCents),
      description: "Set aside for estimated taxes",
      icon: Landmark,
    },
  ];

  return (
    <section aria-labelledby="financial-summary-heading" className="space-y-4">
      <h2 id="financial-summary-heading" className="sr-only">
        Financial summary
      </h2>

      <Card className="overflow-hidden border-blue-200/80 shadow-md dark:border-blue-900/80">
        <div className="h-1 bg-blue-600" />
        <CardContent className="p-5 sm:p-7 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
              Estimated take-home
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
              {scopeLabel}
            </p>
          </div>
          <p className="mt-4 break-words text-4xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white sm:text-5xl">
            {formatCurrency(estimatedTakeHomeCents)}
          </p>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t pt-5 sm:max-w-md sm:gap-8">
            <div>
              <p className="text-xl font-semibold text-slate-900 tabular-nums dark:text-slate-50">
                {workedHours.toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                })}{" "}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  hours
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Time worked
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-blue-700 tabular-nums dark:text-blue-300">
                {formatCurrency(estimatedHourlyRateCents)}
                <span className="text-sm font-medium"> / hr</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Effective hourly rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 tabular-nums dark:text-white">
                      {card.value}
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
