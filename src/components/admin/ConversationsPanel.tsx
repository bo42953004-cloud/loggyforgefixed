"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson } from "@/lib/safe-json";

type Row = { id: number; subject: string; status: string; last_activity_at: string; member_name: string; member_email: string; last_body: string | null; last_author: string | null };
type Reply = { id: number; author: string; body: string; created_at: string };
type Detail = { thread: Row; replies: Reply[] };

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Owner inbox: one conversation per member topic, with a reply box for one-on-one answers. */
export default function ConversationsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/conversations", { cache: "no-store" });
    const data = await readJson(res);
    if (!res.ok) return setError(data.error || "Could not load conversations.");
    setRows(data.items || []);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    const res = await fetch(`/api/admin/conversations/${id}`, { cache: "no-store" });
    const data = await readJson(res);
    if (!res.ok) return setError(data.error || "Could not open conversation.");
    setDetail(data);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selected !== null) void loadDetail(selected);
  }, [selected, loadDetail]);

  async function send() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/conversations/${selected}`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ body: reply }) });
    const data = await readJson(res);
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not send the reply.");
    setReply("");
    setNotice("Reply sent. The member sees it in their dashboard.");
    await Promise.all([loadDetail(selected), loadList()]);
  }

  async function setStatus(status: string) {
    if (!selected) return;
    const res = await fetch(`/api/admin/conversations/${selected}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ status }) });
    const data = await readJson(res);
    if (!res.ok) return setError(data.error || "Could not update status.");
    await Promise.all([loadDetail(selected), loadList()]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Each member has their own threads. Replies go only to that member&apos;s dashboard.</p>
      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">{notice}</div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#101a2b]">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">No conversations yet.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-white/[.05] overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => { setSelected(r.id); setNotice(""); }} className={`w-full px-4 py-3 text-left transition ${selected === r.id ? "bg-amber-400/10" : "hover:bg-white/[.04]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{r.member_name || r.member_email}</span>
                      <span className={`shrink-0 text-[9px] uppercase tracking-wider ${r.status === "open" ? "text-amber-300" : "text-slate-500"}`}>{r.status}</span>
                    </div>
                    <p className="truncate text-xs text-slate-400">{r.subject}</p>
                    <p className="truncate text-[11px] text-slate-600">{r.last_author === "owner" ? "You: " : ""}{r.last_body ?? ""}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/[.07] bg-[#101a2b] p-5">
          {!detail ? (
            <p className="py-16 text-center text-xs text-slate-500">Select a conversation to read and reply.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{detail.thread.member_name || "Member"}</p>
                  <p className="text-xs text-slate-500">{detail.thread.member_email} · {detail.thread.subject}</p>
                </div>
                <select aria-label="Conversation status" value={detail.thread.status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-[#0a1220] px-2 py-1.5 text-[11px] text-slate-300">
                  <option value="open">Open</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {detail.replies.map((r) => (
                  <li key={r.id} className={`rounded-xl p-3 text-sm ${r.author === "owner" ? "border border-amber-400/20 bg-amber-400/5" : "bg-white/[.04]"}`}>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500">{r.author === "owner" ? "You (admin)" : "Member"} · {new Date(r.created_at).toLocaleString()}</span>
                    <span className="mt-1 block whitespace-pre-wrap text-slate-200">{r.body}</span>
                  </li>
                ))}
              </ul>
              {detail.thread.status !== "closed" && (
                <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="space-y-2">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Write a reply to this member…" className="w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50" />
                  <button type="submit" disabled={busy || !reply.trim()} className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-semibold text-[#17120a] disabled:opacity-50">
                    {busy ? "Sending…" : "Send reply"}
                  </button>
                  <p className="text-[10px] text-slate-600">Replies are saved in the member&apos;s dashboard. Email delivery is not connected.</p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
