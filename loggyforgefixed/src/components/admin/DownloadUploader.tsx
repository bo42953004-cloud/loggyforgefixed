"use client";

import { useState, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import { readJson } from "@/lib/safe-json";

/** Uploads a file from this device straight to storage, then publishes it to members in Downloads. */
export default function DownloadUploader({ onSaved }: { onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const blob = await upload(`downloads/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/uploads",
        clientPayload: JSON.stringify({ kind: "download" }),
      });
      const res = await fetch("/api/admin/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          body: `${(file.size / 1048576).toFixed(1)} MB · uploaded from device`,
          url: blob.url,
          status: "published",
        }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "The file uploaded, but could not be published.");
      setDone(`${file.name} is published. Paid members can download it now.`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-amber-400/30 bg-[#111b2c] p-5">
      <div>
        <p className="text-sm font-medium text-slate-100">Upload a file from this device</p>
        <p className="mt-1 text-xs text-slate-500">The file is stored on Vercel Blob and listed for paid members. Any file type is accepted.</p>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        {done && <p className="mt-2 text-xs text-emerald-300">{done}</p>}
      </div>
      <label className={`cursor-pointer rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-[#17120a] hover:bg-amber-300 ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Uploading…" : "Choose file"}
        <input type="file" className="hidden" disabled={busy} onChange={pick} />
      </label>
    </div>
  );
}
