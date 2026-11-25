"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson } from "@/lib/safe-json";

type Reply = { id: number | string; author: "member" | "owner"; body: string; created_at: string };
type Thread = { id: number | string; subject: string; status: string; last_activity_at: string; replies: Reply[] };

const card = "rounded-2xl border border-white/10 bg-[#101830]/70 backdrop-blur-xl";

/** The member's one-on-one conversations with the owner. Replies from the owner appear here. */
export default function MemberConversations({ reloadKey }: { reloadKey: number }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/member/messages", { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not load your conversations.");
      setThreads(data.threads || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  async function reply(threadId: number | string) {
    const key = String(threadId);
    const message = (drafts[key] || "").trim();
    if (!message) return;
    setBusy(key);
    try {
      const res = await fetch("/api/member/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, threadId: Number(threadId) }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Could not send your reply.");
      setDrafts((d) => ({ ...d, [key]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your reply.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`${card} p-6`}>
      <h3 className="font-display text-xl tracking-tight">Your conversations</h3>
      <p className="mt-1 text-xs text-slate-500">Replies from the admin appear here, one conversation per topic.</p>
      {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : threads.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No conversations yet. Send a message and the admin will reply here.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {threads.map((t) => (
            <div key={String(t.id)} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{t.subject}</p>
                <span className="text-[10px] uppercase tracking-widest text-slate-500">{t.status === "answered" ? "Answered" : t.status === "closed" ? "Closed" : "Awaiting reply"}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {t.replies.map((r) => (
                  <li key={String(r.id)} className={`rounded-lg p-3 text-sm ${r.author === "owner" ? "border border-amber-400/20 bg-amber-400/5 text-amber-100" : "bg-white/5 text-slate-300"}`}>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">{r.author === "owner" ? "Admin" : "You"} · {new Date(r.created_at).toLocaleString()}</span>
                    <span className="mt-1 block whitespace-pre-wrap">{r.body}</span>
                  </li>
                ))}
              </ul>
              {t.status !== "closed" && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={drafts[String(t.id)] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [String(t.id)]: e.target.value }))}
                    placeholder="Reply…"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
                  />
                  <button
                    type="button"
                    disabled={busy === String(t.id)}
                    onClick={() => reply(t.id)}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-[#1a0e02] disabled:opacity-50"
                  >
                    {busy === String(t.id) ? "Sending…" : "Send"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
