import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  endOfDay,
  startOfDay,
  subDays,
  format,
  isAfter,
  isBefore,
} from "date-fns";
import {
  calculateWeeklyStats,
  type EntryRow,
  type SettingsRow,
  buildWeeklySummaryEmail,
} from "@/lib/weeklySummary";

export const runtime = "nodejs";

// GET /api/cron/weekly-summary
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    // Allow either Authorization: Bearer <secret> or ?secret=...
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    const queryToken = req.nextUrl.searchParams.get("secret");

    if (headerToken !== cronSecret && queryToken !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  // This week: last 7 days (inclusive)
  const endOfThisRange = endOfDay(now);
  const startOfThisRange = startOfDay(subDays(endOfThisRange, 6));

  // Previous week: 7 days before that
  const endOfPreviousRange = endOfDay(subDays(startOfThisRange, 1));
  const startOfPreviousRange = startOfDay(subDays(endOfPreviousRange, 6));

  const weekLabel = `${format(startOfThisRange, "MMM d")} – ${format(
    endOfThisRange,
    "MMM d"
  )}`;

  // Fetch all entries in the last 14 days (previous week + this week)
  const { data: entriesData, error: entriesError } = await supabaseAdmin
    .from("entries")
    .select("*")
    .gte("started_at", startOfPreviousRange.toISOString())
    .lte("started_at", endOfThisRange.toISOString());

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

    const isInThisWeek =
      (isAfter(startedAt, startOfThisRange) ||
        startedAt.getTime() === startOfThisRange.getTime()) &&
      (isBefore(startedAt, endOfThisRange) ||
        startedAt.getTime() === endOfThisRange.getTime());

    const isInPreviousWeek =
      (isAfter(startedAt, startOfPreviousRange) ||
        startedAt.getTime() === startOfPreviousRange.getTime()) &&
      (isBefore(startedAt, endOfPreviousRange) ||
        startedAt.getTime() === endOfPreviousRange.getTime());

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
