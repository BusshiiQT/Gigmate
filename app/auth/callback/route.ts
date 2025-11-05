// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Prepare the redirect response that we'll RETURN to the browser.
  const redirectUrl = new URL(next, url.origin);
  const res = NextResponse.redirect(redirectUrl);

  // We MUST wire Supabase cookie setters to THIS response (res.cookies),
  // so that exchangeCodeForSession can set HTTP-only cookies on the redirect.
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        // Read cookies from the incoming request
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Write cookies to the response we will return
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const err = new URL("/signin?mode=signin", url.origin);
      err.searchParams.set("error", error.message);
      return NextResponse.redirect(err);
    }
  }

  // On success, return the redirect WITH the Set-Cookie headers attached.
  return res;
}
