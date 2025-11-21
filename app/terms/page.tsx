export const metadata = { title: "Terms of Service — GigMate" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-gray-700">
        By using GigMate, you agree to these terms. GigMate is provided “as is”
        without warranties. You are responsible for the entries you record and any
        decisions you make based on the app’s estimates.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Use of the Service</h2>
        <p className="text-gray-700">
          Do not misuse the service. We may modify or discontinue features at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <p className="text-gray-700">
          Keep your account secure. You’re responsible for all activity under it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Liability</h2>
        <p className="text-gray-700">
          To the fullest extent permitted by law, we are not liable for indirect or
          consequential damages.
        </p>
      </section>
    </main>
  );
}
