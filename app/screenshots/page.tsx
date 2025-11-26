"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import AuthGate from "@/components/AuthGate";

type ScreenshotRow = {
  id: string;
  path: string;
  note: string | null;
  created_at: string;
};

export default function ScreenshotsPage() {
  return (
    <AuthGate>
      <ScreenshotsClient />
    </AuthGate>
  );
}

function ScreenshotsClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<ScreenshotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("screenshots")
        .select("id, path, note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error loading screenshots",
          description: error.message,
        });
        setItems([]);
      } else {
        setItems((data ?? []) as ScreenshotRow[]);
      }

      setLoading(false);
    })();
  }, [toast]);

  const handleDelete = async (item: ScreenshotRow) => {
    if (!confirm("Delete this screenshot? This cannot be undone.")) return;

    // Try to delete from DB first
    const { error: dbError } = await supabase
      .from("screenshots")
      .delete()
      .eq("id", item.id);

    if (dbError) {
      toast({ title: "Delete failed", description: dbError.message });
      return;
    }

    // Then delete from storage (best-effort; ignore failures)
    await supabase.storage.from("screenshots").remove([item.path]);

    setItems((prev) => prev.filter((s) => s.id !== item.id));
    toast({ title: "Screenshot deleted" });
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-4 pb-8 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Screenshots
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Keep your earnings screenshots in one place. Later we&apos;ll let AI
            pull entries from them automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/screenshots/new">
            <Button>+ Upload screenshot</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Loading screenshots…
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed bg-slate-100/90 p-10 text-center text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <div className="mb-3 text-4xl">📸</div>
          <p className="font-medium">No screenshots yet</p>
          <p className="mt-1 text-sm">
            Upload your first screenshot to start building a history of your
            earnings pages.
          </p>
          <Link href="/screenshots/new" className="mt-4">
            <Button size="sm">Upload screenshot</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const url = getPublicUrl(item.path);
            const created = new Date(item.created_at);
            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border bg-slate-100/90 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="relative aspect-[4/3] w-full bg-slate-200 dark:bg-slate-800">
                  {url && (
                    <Image
                      src={url}
                      alt={item.note || "Screenshot"}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {created.toLocaleDateString()} •{" "}
                    {created.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {item.note && (
                    <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-100">
                      {item.note}
                    </p>
                  )}
                  <div className="mt-auto flex justify-end gap-2 pt-2">
                    {/* Future: "Create entry from screenshot" */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
