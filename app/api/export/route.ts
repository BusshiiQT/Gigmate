import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper: cents → dollars
function centsToDollars(cents: number | null | undefined) {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toFixed(2);
}

export async function GET(req: Request) {
  // Read Bearer token from the Authorization header
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Create a plain supabase-js client and attach the token as a global header.
  // RLS will evaluate using this JWT.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Optional: verify token can fetch user (nice error if expired)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the user's rows with RLS
  const { data: rows, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const header = [
    "id",
    "platform",
    "started_at",
    "ended_at",
    "hours",
    "miles",
    "gross_usd",
    "tips_usd",
    "fuel_cost_usd",
    "notes",
  ].join(",");

  const lines = (rows ?? []).map((r) => {
    const started = new Date(r.started_at).toISOString();
    const ended = new Date(r.ended_at).toISOString();
    const hours = Math.max(
      0,
      (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) /
        (1000 * 60 * 60)
    ).toFixed(2);
    const notes =
      r.notes && r.notes.length
        ? `"${String(r.notes).replace(/"/g, '""')}"`
        : "";

    return [
      r.id,
      r.platform,
      started,
      ended,
      hours,
      Number(r.miles ?? 0).toFixed(2),
      centsToDollars(r.gross_cents),
      centsToDollars(r.tips_cents),
      centsToDollars(r.fuel_cost_cents),
      notes,
    ].join(",");
  });

  const csv = [header, ...lines].join("\r\n");

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const filename = `gigmate-entries-${y}-${m}-${d}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
