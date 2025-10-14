"use client";

import { useState } from "react";
import { supabaseBrowser } from "../supabase/client";

type Props = {
  bucket: "avatars" | "wedding_inspo" | "portfolio";
  onUploaded: (publicUrl: string, path: string) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
};

export default function UploadInput({
  bucket,
  onUploaded,
  label = "Upload",
  accept = "image/*",
  multiple = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    setErr(null);
    try {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      if (!me?.user) throw new Error("Not authenticated");

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${me.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await sb.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;

        const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
        onUploaded(pub.publicUrl, path);
      }

      e.target.value = ""; // reset
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="inline-block">
        <span className="px-3 py-2 text-sm border rounded cursor-pointer">
          {busy ? "Uploading…" : label}
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
          disabled={busy}
        />
      </label>
      {err && <p className="text-red-600 text-sm mt-1">{err}</p>}
    </div>
  );
}
