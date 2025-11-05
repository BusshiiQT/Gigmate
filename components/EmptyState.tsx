"use client";

export default function EmptyState({
  emoji = "📭",
  title = "Nothing here yet",
  hint,
  cta,
}: {
  emoji?: string;
  title?: string;
  hint?: string | React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <div className="card text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {hint ? <p className="mt-1 text-gray-600">{hint}</p> : null}
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
