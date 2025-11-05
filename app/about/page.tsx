// app/about/page.tsx
export const metadata = {
  title: "About — GigMate",
};

export default function AboutPage() {
  return (
    <main className="space-y-8">
      <section className="rounded-2xl border bg-white p-6">
        <h1 className="text-2xl font-bold">Why GigMate?</h1>
        <p className="mt-2 text-gray-700">
          Most gig apps show gross earnings, not <em>true profit</em>. GigMate helps you see
          what really matters: mileage deduction, fuel, taxes, and your effective hourly rate.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Track earnings faster</h2>
          <p className="mt-1 text-gray-700">
            Add entries in seconds. Uber, Lyft, DoorDash, Instacart, Amazon Flex, or other.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Know your real hourly</h2>
          <p className="mt-1 text-gray-700">
            We factor in mileage deduction, fuel & taxes. You get a clean weekly view.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Own your data</h2>
          <p className="mt-1 text-gray-700">
            Your data is stored in your account with secure row-level rules. Export anytime.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Mobile first</h2>
          <p className="mt-1 text-gray-700">
            A bottom tab bar and clean cards make it easy to use on the go.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 text-center">
        <h2 className="text-lg font-semibold">Ready to see your true profit?</h2>
        <p className="mt-1 text-gray-700">
          Sign in, add your first entry, and watch your weekly net come to life.
        </p>
        <a
          href="/entries/new"
          className="mt-4 inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          Add an Entry
        </a>
      </section>
    </main>
  );
}
