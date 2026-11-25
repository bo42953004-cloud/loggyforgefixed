"use client";
import { readJson } from "@/lib/safe-json";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await readJson(response); if (!response.ok) throw new Error(data.error || "Sign in failed.");
      router.replace("/admin"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#080d18] px-5 py-12 text-white"><div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center">
    <Link href="/" className="mb-8 text-xs font-semibold uppercase tracking-[.28em] text-amber-400">LOGGYFORGE <span className="text-slate-500">/ OWNER ACCESS</span></Link>
    <section className="rounded-3xl border border-white/10 bg-[#111a2c] p-7 shadow-2xl sm:p-9">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-xl text-amber-300">⌘</div>
      <p className="text-[10px] font-semibold uppercase tracking-[.25em] text-slate-500">Private control room</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin sign in</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Sign in with the owner credentials configured in your deployment environment.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-xs text-slate-400">Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/60" /></label>
        <label className="block text-xs text-slate-400">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1120] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/60" /></label>
        {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-amber-300 disabled:opacity-60">{busy ? "Verifying…" : "Enter admin portal"}</button>
      </form>
    </section><p className="mt-5 text-center text-[11px] text-slate-600">Restricted access · Sessions expire after 8 hours</p>
  </div></main>;
}
