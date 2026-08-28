"use client";

import { Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EmptyState({
  title = "Nothing here yet",
  hint,
  cta,
}: {
  title?: string;
  hint?: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:py-12">
        <span className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Car aria-hidden="true" className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        {hint ? (
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {cta ? <div className="mt-5">{cta}</div> : null}
      </CardContent>
    </Card>
  );
}
