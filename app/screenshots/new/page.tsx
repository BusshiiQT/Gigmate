"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type UploadState = "idle" | "uploading";

export default function NewScreenshotPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<UploadState>("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "No file selected", description: "Choose a screenshot first." });
      return;
    }

    setState("uploading");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setState("idle");
      toast({
        title: "Not signed in",
        description: "Please sign in to upload screenshots.",
      });
      router.replace("/signin");
      return;
    }

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;

      // 1) Upload to storage
      const { error: storageError } = await supabase.storage
        .from("screenshots")
        .upload(path, file);

      if (storageError) {
        throw new Error(storageError.message);
      }

      // 2) Insert metadata row
      const { error: insertError } = await supabase.from("screenshots").insert({
        user_id: user.id,
        path,
        note: note.trim() || null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({ title: "Screenshot uploaded" });
      router.push("/screenshots");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: err.message ?? "Something went wrong.",
      });
      setState("idle");
    }
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-8 sm:p-6 md:p-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Upload screenshot
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Add a screenshot of your earnings. Later, we&apos;ll use AI to auto-fill entries.
          </p>
        </div>
        <Link href="/screenshots" className="text-sm text-slate-500 hover:underline">
          Back to screenshots
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border bg-slate-100/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5"
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
            Screenshot
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
            Upload a screenshot of your Uber, DoorDash, Instacart, etc. earnings page.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
            Note (optional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g. Friday dinner rush, mostly DoorDash downtown."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/screenshots")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={state === "uploading"}>
            {state === "uploading" ? "Uploading…" : "Upload screenshot"}
          </Button>
        </div>
      </form>
    </main>
  );
}
