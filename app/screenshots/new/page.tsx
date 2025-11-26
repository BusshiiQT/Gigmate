// app/screenshots/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function NewScreenshotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Upload failed", description: "Please pick an image." });
      return;
    }

    try {
      setUploading(true);

      // Make sure we have a logged-in user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        throw new Error("You must be signed in to upload screenshots.");
      }

      // 1) Upload to the "screenshots" bucket
      const ext = file.name.split(".").pop() ?? "png";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("screenshots")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageErr) throw storageErr;

      // 2) Insert DB row WITHOUT user_id (default = auth.uid())
      const { error: insertErr } = await supabase.from("screenshots").insert({
        bucket: "screenshots",
        path: filePath,
        original_name: file.name,
      });

      if (insertErr) throw insertErr;

      toast({ title: "Screenshot uploaded" });
      router.push("/screenshots");
    } catch (err: any) {
      console.error("Upload error", err);
      toast({
        title: "Upload failed",
        description: err.message ?? "Something went wrong.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Import from screenshot (beta)
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Upload a gig earnings screenshot. In a future update we&apos;ll auto-parse
        the totals into entries.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
            Screenshot file
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PNG or JPG. Max 5MB.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/screenshots")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </main>
  );
}
