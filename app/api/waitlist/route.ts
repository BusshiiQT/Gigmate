// app/api/waitlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Supabase: use service role so RLS / anon permissions don't matter ----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client – server-only (service role)
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Simple email validator
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = (body?.email || "").toString().trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    // 1) Upsert using service role – ignores duplicates, bypasses RLS
    const { error: upsertErr, status: upsertStatus } = await admin
      .from("waitlist_emails")
      .upsert(
        { email },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (upsertErr) {
      return NextResponse.json({
        ok: true,
        saved: false,
        emailed: false,
        note: `Upsert failed (service role): ${upsertErr.message}`,
        upsertStatus,
      });
    }

    // 2) Email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM =
      process.env.MAIL_FROM || "GigMate <hello@hectorvirrey.com>";
    const BRAND_NAME = process.env.BRAND_NAME || "GigMate";

    if (!RESEND_API_KEY || !MAIL_FROM) {
      return NextResponse.json({
        ok: true,
        saved: true,
        emailed: false,
        note: "Email provider not configured (missing RESEND_API_KEY or MAIL_FROM).",
      });
    }

    const subject = `Welcome to ${BRAND_NAME} — See your true profit`;
    const html = `<!doctype html><html><body>
      <h2>Thanks for joining ${BRAND_NAME} 👋</h2>
      <p>${BRAND_NAME} helps gig workers track true profit after fuel, mileage, and taxes.</p>
    </body></html>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: MAIL_FROM, to: [email], subject, html }),
    });

    const status = resp.status;
    const text = await resp.text().catch(() => "");

    if (!resp.ok) {
      return NextResponse.json({
        ok: true,
        saved: true,
        emailed: false,
        provider: "resend",
        status,
        note: text,
        from: MAIL_FROM,
      });
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      emailed: true,
      provider: "resend",
      status,
      from: MAIL_FROM,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 200 }
    );
  }
}
