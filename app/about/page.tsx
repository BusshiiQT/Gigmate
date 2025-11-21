// app/about/page.tsx

export const metadata = {
  title: "About GigMate",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 pb-12 pt-8 sm:px-6 md:px-8">
      <section className="rounded-3xl bg-slate-100/90 p-6 shadow-sm dark:bg-slate-900">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
  Why GigMate? 
</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          Most gig apps show gross earnings, not <span className="italic">true profit</span>.
          GigMate helps you see what really matters: mileage deduction, fuel,
          taxes, and your effective hourly rate.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-slate-100/90 p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Track earnings faster
          </h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            Add entries in seconds. Uber, Lyft, DoorDash, Instacart, Amazon Flex,
            or other platforms.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-100/90 p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Know your real hourly
          </h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            We factor in mileage deduction, fuel &amp; estimated taxes so you get
            a clean weekly view of net profit and effective hourly rate.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-100/90 p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Own your data
          </h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            Your data is stored in your own Supabase account with secure row-level
            rules. Export anytime as CSV.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-100/90 p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            What&apos;s coming next
          </h2>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            Automated ingestion, best-time/best-zone insights, forecasting, and an
            AI assistant that can answer questions like{" "}
            <span className="italic">“Should I work Uber or DoorDash tonight?”</span>.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-slate-100/90 p-6 text-center shadow-sm dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Ready to see your true profit?
        </h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
          Sign in, add your first entry, and watch your weekly net come to life.
        </p>
      </section>
    </main>
  );
}
