// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import "./globals.css";
import Header from "@/components/Header";
import MobileTabBar from "@/components/MobileTabBar";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "GigMate — Track gigs, see true profit",
  description:
    "GigMate helps ride-share & delivery drivers track earnings across platforms, factor in fuel, mileage & taxes, and see true profit.",
  applicationName: "GigMate",
  keywords: [
    "gig",
    "rideshare",
    "delivery",
    "uber",
    "doordash",
    "earnings",
    "mileage",
    "taxes",
    "profit",
  ],
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GigMate" },
  formatDetection: { telephone: false },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "GigMate — Track gigs, see true profit",
    description:
      "Track earnings, mileage, fuel & taxes across gig platforms. Know your real hourly.",
    url: "http://localhost:3000",
    siteName: "GigMate",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GigMate — Track gigs, see true profit",
    description:
      "Track earnings, mileage, fuel & taxes across gig platforms. Know your real hourly.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

import { Plus_Jakarta_Sans } from "next/font/google";
const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set() {},
        remove() {},
      },
    }
  );

  return (
    <html lang="en" className={font.variable}>
      <body className="min-h-screen bg-app dark:bg-[#0b0f14]">
        <ThemeProvider>
          <ToastProvider>
            <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-white to-white dark:from-sky-900/20 dark:via-[#0b0f14] dark:to-[#0b0f14]" />
            <Header />
            <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
            <MobileTabBar />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
