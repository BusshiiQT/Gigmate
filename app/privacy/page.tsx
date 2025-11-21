export const metadata = { title: "Privacy Policy — GigMate" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-gray-700">
        We respect your privacy. GigMate stores your profile, settings, and entries
        in a secure database with Row Level Security so only you can access your data.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Data we store</h2>
        <ul className="list-inside list-disc text-gray-700">
          <li>Email address (for sign-in)</li>
          <li>Settings (mileage rate, tax rate)</li>
          <li>Earning entries (platform, times, amounts, notes)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Data sharing</h2>
        <p className="text-gray-700">
          We do not sell your data. Data is only shared with service providers we use to
          run GigMate (e.g., authentication & hosting). You may export your data to CSV
          at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-gray-700">
          Questions? Email support@gigmate.example (replace with your real address).
        </p>
      </section>
    </main>
  );
}
