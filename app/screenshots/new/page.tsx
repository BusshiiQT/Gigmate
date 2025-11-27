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

      console.log("Uploading screenshot to bucket 'screenshots' at path:", path);

      // ✅ Only upload to storage. No DB insert for now.
      const { error: uploadErr } = await supabase.storage
        .from("screenshots") // bucket name you confirmed exists
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        throw uploadErr;
      }

      toast({
        title: "Upload complete",
        description:
          "Your screenshot was uploaded. Parsing into entries is coming in a future update.",
      });
      setFile(null);
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast({
        title: "Upload failed",
        description: err?.message ?? "Something went wrong.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-8 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
        Upload screenshot (beta)
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Upload a screenshot of your gig earnings. In a future version we&apos;ll
        auto-parse this into entries and show a gallery.
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
