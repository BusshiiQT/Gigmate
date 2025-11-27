// app/screenshots/new/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function NewScreenshotPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Choose a screenshot first.",
      });
      return;
    }

    setUploading(true);
    try {
      // 1) Get current user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        throw new Error("You must be signed in to upload screenshots.");
      }

      const ext = file.name.split(".").pop() || "png";
      const base = file.name.replace(/\.[^/.]+$/, "");
      const path = `${user.id}/${Date.now()}-${base}.${ext}`;

      // 2) Upload to the EXISTING "screenshots" bucket
      const { error: uploadErr } = await supabase.storage
        .from("screenshots") // 👈 must match bucket name in Supabase
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // 3) Insert DB row into screenshot_uploads with user_id for RLS
      const { error: dbErr } = await supabase.from("screenshot_uploads").insert({
        user_id: user.id,
        path,
      });

      if (dbErr) throw dbErr;

      toast({
        title: "Upload complete",
        description: "Your screenshot was uploaded successfully.",
      });
      setFile(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: err.message ?? "Something went wrong.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-8 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
        Upload screenshot
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Upload a screenshot of your gig earnings. In a future version we&apos;ll
        auto-parse this into entries.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 dark:text-slate-100"
      />

      <div className="flex gap-2">
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </main>
  );
}
