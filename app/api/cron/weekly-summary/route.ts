import { NextRequest, NextResponse } from "next/server.js";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
// Node executes the cron helper tests directly and requires runtime extensions.
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { getCompletedUtcWeekRange, isInHalfOpenRange } from "../../../../lib/datetime.ts";
// @ts-expect-error TypeScript does not allow .ts extensions without allowImportingTsExtensions.
import { buildWeeklySummaryEmail, calculateWeeklyStats, type EntryRow, type SettingsRow } from "../../../../lib/weeklySummary.ts";


export const runtime = "nodejs";

type CronAuthResult =
  | { authorized: true }
  | { authorized: false; status: 401 | 500; error: string };

export function getCronAuthResult(
  authorizationHeader: string | null,
  cronSecret: string | undefined
): CronAuthResult {
  if (!cronSecret) {
    return {
      authorized: false,
      status: 500,
      error: "Cron authentication is not configured.",
    };
  }

  if (authorizationHeader !== `Bearer ${cronSecret}`) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  return { authorized: true };
}

function formatUtcPeriodBoundary(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

// GET /api/cron/weekly-summary
export async function GET(req: NextRequest) {
  const authResult = getCronAuthResult(
    req.headers.get("authorization"),
    process.env.CRON_SECRET
  );
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.MAIL_FROM || process.env.WEEKLY_SUMMARY_FROM_EMAIL;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail) {
    return NextResponse.json(
      {
        error:
          "Missing required env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM or WEEKLY_SUMMARY_FROM_EMAIL).",
      },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const resend = new Resend(resendApiKey);

  const now = new Date();
  const thisWeekRange = getCompletedUtcWeekRange(now);
  const previousWeekRange = getCompletedUtcWeekRange(now, -1);
  const weekLabel = `${formatUtcPeriodBoundary(
    thisWeekRange.startInclusive
  )} – ${formatUtcPeriodBoundary(thisWeekRange.endExclusive)} (UTC)`;

  // Fetch all entries in the last 14 days (previous week + this week)
  const { data: entriesData, error: entriesError } = await supabaseAdmin
    .from("entries")
    .select("*")
    .gte("started_at", previousWeekRange.startInclusive.toISOString())
    .lt("started_at", thisWeekRange.endExclusive.toISOString());

  if (entriesError) {
    console.error("Error fetching entries for weekly summary:", entriesError);
    return NextResponse.json(
      { error: "Failed to fetch entries." },
      { status: 500 }
    );
  }

  const entries = (entriesData ?? []) as EntryRow[];

  // Group entries by user and by period
  type UserBuckets = {
    thisWeek: EntryRow[];
    previousWeek: EntryRow[];
  };

  const entriesByUser = new Map<string, UserBuckets>();

  for (const entry of entries) {
    const userId = entry.user_id;
    if (!userId || !entry.started_at) continue;

    const startedAt = new Date(entry.started_at);
    if (isNaN(startedAt.getTime())) continue;

    const isInThisWeek = isInHalfOpenRange(startedAt, thisWeekRange);
    const isInPreviousWeek = isInHalfOpenRange(startedAt, previousWeekRange);

    if (!isInThisWeek && !isInPreviousWeek) continue;

    if (!entriesByUser.has(userId)) {
      entriesByUser.set(userId, { thisWeek: [], previousWeek: [] });
    }

    const bucket = entriesByUser.get(userId)!;
    if (isInThisWeek) {
      bucket.thisWeek.push(entry);
    } else if (isInPreviousWeek) {
      bucket.previousWeek.push(entry);
    }
  }

  const userIds = Array.from(entriesByUser.keys());
  if (userIds.length === 0) {
    return NextResponse.json({
      message: "No entries in the last 14 days. Nothing to send.",
    });
  }

  const results = await Promise.all(
    userIds.map(async (userId) => {
      const { thisWeek, previousWeek } = entriesByUser.get(userId)!;

      // Fetch user settings
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from("settings")
        .select("user_id, mileage_rate_cents, tax_rate_bps")
        .eq("user_id", userId)
        .maybeSingle();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error(
          `Error fetching settings for user ${userId}:`,
          settingsError
        );
      }

      const settings = (settingsData ?? null) as SettingsRow | null;

      // Fetch user email from auth
      const { data: userResult, error: authError } =
        await supabaseAdmin.auth.admin.getUserById(userId);

      if (authError || !userResult?.user?.email) {
        console.error(
          `Error fetching auth user/email for user ${userId}:`,
          authError
        );
        return {
          userId,
          skipped: true,
          reason: "No email or auth error.",
          thisWeekEntryCount: thisWeek.length,
          previousWeekEntryCount: previousWeek.length,
        };
      }

      const email = userResult.user.email;
      const fullName =
        typeof userResult.user.user_metadata?.full_name === "string"
          ? (userResult.user.user_metadata.full_name as string)
          : null;
      const firstName = fullName ? fullName.split(" ")[0] : null;

      // Compute stats
      const thisWeekStats = calculateWeeklyStats(thisWeek, settings);
      const previousWeekStats =
        previousWeek.length > 0
          ? calculateWeeklyStats(previousWeek, settings)
          : null;

      const { subject, html, text } = buildWeeklySummaryEmail({
        userFirstName: firstName,
        weekLabel,
        thisWeek: thisWeekStats,
        previousWeek: previousWeekStats,
      });

      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject,
          html,
          text,
        });

        return {
          userId,
          skipped: false,
          thisWeekEntryCount: thisWeek.length,
          previousWeekEntryCount: previousWeek.length,
        };
      } catch (sendError) {
        console.error(`Error sending weekly summary to ${userId}:`, sendError);
        return {
          userId,
          skipped: true,
          reason: "Resend error.",
          thisWeekEntryCount: thisWeek.length,
          previousWeekEntryCount: previousWeek.length,
        };
      }
    })
  );

  const sentCount = results.filter((r) => !r.skipped).length;

  return NextResponse.json({
    message: "Weekly summaries processed.",
    totalUsersWithEntries: userIds.length,
    sentCount,
    results,
  });
}
