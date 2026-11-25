"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import { readJson } from "@/lib/safe-json";

type Site = { title: string; description: string; about: string; logoUrl: string };

const KEYS: Record<keyof Site, string> = { title: "site.title", description: "site.description", about: "site.about", logoUrl: "site.logo_url" };
const inputCls = "mt-2 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50";

/** Logo, About text and browser title. Each change is saved to admin_settings and shown on the site on the next load. */
export default function SitePanel() {
  const [draft, setDraft] = useState<Site>({ title: "", description: "", about: "", logoUrl: "" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/site", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Site) => {
        setDraft({ title: d.title, description: d.description, about: d.about, logoUrl: d.logoUrl });
        setLoaded(true);
      })
      .catch(() => setError("Could not load the current site settings."));
  }, []);

  async function saveKeys(values: Partial<Site>) {
    const entries = Object.entries(values) as Array<[keyof Site, string]>;
    for (const [field, value] of entries) {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: KEYS[field], value }),
      });
      if (!res.ok) throw new Error((await readJson(res)).error || "Could not save.");
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!draft.title.trim()) throw new Error("The browser title cannot be empty.");
      await saveKeys({ title: draft.title.trim(), description: draft.description.trim(), about: draft.about.trim() });
      setNotice("Saved. Refresh the site to see the new title and About text.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function pickLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const blob = await upload(`site/logo-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/uploads",
        clientPayload: JSON.stringify({ kind: "logo" }),
      });
      await saveKeys({ logoUrl: blob.url });
      setDraft((d) => ({ ...d, logoUrl: blob.url }));
      setNotice("Logo updated. It also becomes the browser tab icon.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    setBusy(true);
    try {
      await saveKeys({ logoUrl: "" });
      setDraft((d) => ({ ...d, logoUrl: "" }));
      setNotice("Logo removed. The default ◆ mark is shown again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-white/[.07] bg-[#101a2b] p-6">
        {error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">{notice}</div>}
        <label className="block text-xs text-slate-400">
          Browser tab title
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={!loaded} maxLength={120} className={inputCls} />
        </label>
        <label className="block text-xs text-slate-400">
          Search description
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={!loaded} rows={2} maxLength={300} className={inputCls} />
        </label>
        <label className="block text-xs text-slate-400">
          About text (landing page). Leave a blank line between paragraphs.
          <textarea value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} disabled={!loaded} rows={8} maxLength={4000} className={inputCls} />
        </label>
        <button type="button" onClick={save} disabled={busy || !loaded} className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-semibold text-[#17120a] disabled:opacity-60">
          {busy ? "Saving…" : "Save text settings"}
        </button>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-white/[.07] bg-[#101a2b] p-6">
          <p className="text-sm font-medium">Logo</p>
          <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-white/10 bg-[#09111f]">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="Current logo" className="max-h-16 max-w-[70%] object-contain" />
            ) : (
              <span className="text-2xl text-amber-400">◆</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label className={`cursor-pointer rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-[#17120a] ${busy ? "pointer-events-none opacity-60" : ""}`}>
              Upload logo
              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={pickLogo} />
            </label>
            {draft.logoUrl && (
              <button type="button" onClick={removeLogo} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/[.05]">
                Remove
              </button>
            )}
          </div>
          <p className="mt-3 text-[10px] text-slate-600">PNG, JPG, WebP or SVG, up to 2 MB. Square images look best.</p>
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-[#101a2b] p-6">
          <p className="text-sm font-medium">Browser tab preview</p>
          <div className="mt-4 flex items-center gap-2 rounded-t-xl border border-white/10 bg-[#0a1220] px-3 py-2">
            <span className="grid h-4 w-4 place-items-center overflow-hidden rounded-sm text-[10px] text-amber-400">
              {draft.logoUrl ? <img src={draft.logoUrl} alt="" className="h-full w-full object-contain" /> : "◆"}
            </span>
            <span className="truncate text-xs text-slate-300">{draft.title || "Untitled"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
