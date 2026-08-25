import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildEntryExportCsv,
  type ExportEntry,
  type ExportSettings,
} from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Read Bearer token from the Authorization header
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Create a plain supabase-js client and attach the token as a global header.
  // RLS will evaluate using this JWT.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Export service is not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Optional: verify token can fetch user (nice error if expired)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the user's rows with RLS
  const { data: rows, error: entriesError } = await supabase
    .from("entries")
    .select(
      "id, platform, started_at, ended_at, gross_cents, tips_cents, miles, fuel_cost_cents, notes"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (entriesError) {
    return NextResponse.json(
      { error: "Failed to load entries for export" },
      { status: 500 }
    );
  }

  const { data: settingsData, error: settingsError } = await supabase
    .from("settings")
    .select("mileage_rate_cents, tax_rate_bps")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      { error: "Failed to load settings for export" },
      { status: 500 }
    );
  }

  let csv: string;
  try {
    csv = buildEntryExportCsv(
      (rows ?? []) as ExportEntry[],
      (settingsData ?? null) as ExportSettings
    );
  } catch (error: unknown) {
    console.error("Failed to generate CSV export", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }

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
