// app/screenshots/new/page.tsx

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewScreenshotPage() {
  return (
    <main className="mx-auto max-w-2xl p-4 pb-8 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Screenshot import (coming soon)
      </h1>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
        We&apos;re working on a feature to import entries from your gig earnings
        screenshots (Uber, DoorDash, Instacart, etc.).
      </p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        For now, please add shifts using the{" "}
        <span className="font-semibold">New Entry</span> form.
      </p>

      <div className="mt-6">
        <Link href="/entries/new">
          <Button>Go to New Entry</Button>
        </Link>
      </div>
    </main>
  );
}
