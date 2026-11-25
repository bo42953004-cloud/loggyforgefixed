"use client";

import { readJson } from "@/lib/safe-json";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import Backdrop from "@/components/theme/Backdrop";
import CountUp from "@/components/theme/CountUp";
import ReferralDashboard from "@/components/member/ReferralDashboard";

type TabId = "updates" | "referrals" | "downloads" | "videos" | "contact";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "updates", label: "Updates", icon: "🔔" },
  { id: "referrals", label: "Referrals", icon: "🔗" },
  { id: "downloads", label: "Downloads", icon: "📦" },
  { id: "videos", label: "Videos", icon: "🎬" },
  { id: "contact", label: "Contact admin", icon: "✉️" },
];

/* ----------------------------- demo content ----------------------------- */
/* Placeholder data — replaced by API calls once the admin panel exists. */

const UPDATES = [
  {
    id: 1,
    date: "Today",
    title: "Welcome to LOGGYFORGE",
    body: "Your dashboard is live. Referral earnings, admin updates, shared files and tutorial videos all live here in one place.",
    fresh: true,
  },
  {
    id: 2,
    date: "2 days ago",
    title: "The non-stop writer now rotates all three languages",
    body: "Each cycle writes matching cards into index.html, styles.css and script.js — so the preview stays styled and animated the whole time.",
    fresh: true,
  },
  {
    id: 3,
    date: "Last week",
    title: "Video tutorials are here",
    body: "Watch the Videos tab for walkthroughs: first website in 60 seconds, the non-stop writer, and publishing to Vercel.",
    fresh: false,
  },
];

const REFERRAL_CODE = "LOGG-8F3K2";

const REFERRED = [
  { name: "amelia.n@brightlabs.io", joined: "Oct 2, 2026", plan: "Full access", status: "paid", commission: 8.4 },
  { name: "marcus.t@studiohex.com", joined: "Sep 28, 2026", plan: "Full access", status: "paid", commission: 8.4 },
  { name: "sofia.r@northwind.co", joined: "Sep 21, 2026", plan: "Full access", status: "paid", commission: 8.4 },
  { name: "devon.k@pixelbay.app", joined: "Sep 14, 2026", plan: "Full access", status: "pending", commission: 8.4 },
  { name: "ines.p@orbital.dev", joined: "Sep 3, 2026", plan: "Full access", status: "pending", commission: 8.4 },
];

const FILES = [
  { name: "loggyforge-toolkit.zip", size: "24.6 MB", kind: "Toolkit · installer & assets", shared: "Shared Oct 4, 2026" },
  { name: "loggyforge-cursor-pack.zip", size: "8.1 MB", kind: "Cursor editor pack · rules & snippets", shared: "Shared Oct 4, 2026" },
];

const VIDEOS = [
  { title: "Getting started with LOGGYFORGE", duration: "4:12", hue: "from-[#EA580C] to-[#F59E0B]" },
  { title: "The non-stop writer, explained", duration: "6:48", hue: "from-[#6d28d9] to-[#22D3EE]" },
  { title: "Publishing your site to Vercel", duration: "3:27", hue: "from-[#0D9488] to-[#A3E635]" },
];

const MARQUEE = [
  "Admin updates", "Referral earnings", "Shared downloads", "Tutorial videos", "Direct contact",
  "Typewriter engine", "Live preview", "8 languages",
];

const money = (n: number) => `$${n.toFixed(2)}`;

/* --------------------------------- UI bits --------------------------------- */

const card =
  "card-sheen rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md transition duration-300";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-400/10";

const labelCls = "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-500";

function spawnRipple(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  el.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 650);
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] leading-tight tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{sub}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
        paid ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-400" : "bg-amber-400"}`} />
      {status}
    </span>
  );
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg shadow-[0_0_22px_rgba(255,140,26,0.55)]"
      style={{ width: size, height: size }}
    >
      ◆
    </span>
  );
}

/* ------------------------------- the dashboard ------------------------------- */

export default function DashboardClient() {
  const [tab, setTab] = useState<TabId>("updates");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState<Array<{id:number; title:string; body:string; created_at?:string; date?:string; fresh?:boolean}>>([]);
  const [liveFiles, setLiveFiles] = useState<Array<{id:number; title:string; body:string; url:string}>>([]);
  const [liveVideos, setLiveVideos] = useState<Array<{id:number; title:string; body:string; url:string}>>([]);
  const [messageBusy, setMessageBusy] = useState(false);

  useEffect(() => {
    Promise.all(["announcements", "downloads", "videos"].map(async resource => {
      const response = await fetch(`/api/content/${resource}`, { cache: "no-store" });
      if (!response.ok) return [];
      const data = await readJson(response); return data.items || [];
    })).then(([updates, files, videos]) => {
      setLiveUpdates(updates as typeof liveUpdates); setLiveFiles(files as typeof liveFiles); setLiveVideos(videos as typeof liveVideos);
    }).catch(() => undefined);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2800);
  };

  const refPath = `/login?ref=${REFERRAL_CODE}`;

  const copyLink = async (e: MouseEvent<HTMLElement>) => {
    spawnRipple(e);
    try {
      await navigator.clipboard.writeText(window.location.origin + refPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("Copying failed — select the link manually.");
    }
  };

  const paidCount = REFERRED.filter((r) => r.status === "paid").length;
  const earned = REFERRED.filter((r) => r.status === "paid").reduce((s, r) => s + r.commission, 0);
  const pending = REFERRED.filter((r) => r.status === "pending").reduce((s, r) => s + r.commission, 0);

  const tabButton = (t: (typeof TABS)[number], horizontal = false) => {
    const on = tab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setTab(t.id)}
        aria-current={on ? "page" : undefined}
        className={
          horizontal
            ? `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                on
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-[#1a0e02] shadow-[0_8px_20px_-6px_rgba(255,140,26,0.6)]"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:text-white"
              }`
            : `group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${
                on
                  ? "bg-gradient-to-r from-amber-400/20 via-amber-400/5 to-transparent text-amber-300 shadow-[inset_3px_0_0_#fbbf24]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`
        }
      >
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg text-base transition group-hover:scale-110 ${
            on && !horizontal ? "bg-amber-400/20" : horizontal ? "bg-transparent" : "bg-white/5"
          }`}
        >
          {t.icon}
        </span>
        {t.label}
      </button>
    );
  };

  return (
    <div className="relative min-h-screen font-body text-white antialiased">
      <Backdrop dim />

      <div className="relative z-10 flex min-h-screen">
        {/* ------------------------- vertical tab rail ------------------------- */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#0b1224]/70 backdrop-blur-xl md:flex">
          <Link href="/" className="flex items-center gap-2.5 px-5 pb-4 pt-6 text-sm font-semibold tracking-widest text-white/85 transition hover:text-white">
            <Logo />
            LOGGY<span className="-ml-2 text-amber-400">FORGE</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 pb-4">
            <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Your dashboard</p>
            {TABS.map((t) => tabButton(t))}
          </nav>

          <div className="border-t border-white/10 px-4 py-4">
            <Link
              href="/studio"
              className="shimmer flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 px-4 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#1a0e02] shadow-[0_18px_40px_-10px_rgba(255,140,26,0.55)] transition hover:-translate-y-0.5"
            >
              Enter platform now
              <span className="arrow-nudge">→</span>
            </Link>
            <div className="mt-2.5 flex justify-between px-1 text-xs text-slate-500">
              <Link href="/account/subscribe" className="transition hover:text-amber-300">Subscription</Link>
              <Link href="/account/referrals" className="transition hover:text-amber-300">Referral account</Link>
              <Link href="/sheet" className="transition hover:text-amber-300">Spreadsheet</Link>
              <Link href="/" className="transition hover:text-amber-300">← Home</Link>
            </div>
          </div>
        </aside>

        {/* ------------------------------- content ------------------------------- */}
        <main className="min-w-0 flex-1">
          {/* mobile top bar */}
          <div className="sticky top-0 z-30 border-b border-white/10 bg-[#070B18]/85 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between px-4 pt-3">
              <Link href="/" className="flex items-center gap-2 text-xs font-semibold tracking-widest text-white/85">
                <Logo size={28} />
                LOGGY<span className="-ml-1.5 text-amber-400">FORGE</span>
              </Link>
              <Link
                href="/studio"
                className="shimmer flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#1a0e02]"
              >
                Enter platform <span className="arrow-nudge">→</span>
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-2.5">{TABS.map((t) => tabButton(t, true))}</div>
          </div>

          <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
            {/* greeting */}
            <header className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">Your space</p>
                <h1 className="mt-1.5 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05] tracking-[-0.02em]">
                  Welcome back, <span className="gradient-pan">builder.</span>
                </h1>
                <p className="mt-2 text-sm text-slate-400">Everything the admin shares with you — updates, earnings, files and videos.</p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-4 backdrop-blur-md">
                <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 font-display text-sm text-[#1a0e02]">
                  LF
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">LOGGYFORGE builder</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="pulse-ring inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> online
                  </p>
                </div>
              </div>
            </header>

            {/* tab content (animates on change) */}
            <div key={tab} className="tab-in">
              {/* ------------------------------ UPDATES ------------------------------ */}
              {tab === "updates" && (
                <section className="space-y-5">
                  <SectionTitle eyebrow="Updates" title="News from the admin" sub="Everything published to your platform shows up here first." />
                  {liveUpdates.length === 0 && <p className={`${card} p-6 text-sm text-slate-500`}>There are no published announcements yet.</p>}
                  {liveUpdates.map((u, i) => (
                    <article
                      key={u.id}
                      className={`${card} rise group flex gap-4 p-5 hover:-translate-y-1 hover:border-amber-400/40 hover:shadow-[0_24px_60px_-18px_rgba(251,191,36,0.3)]`}
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-xl transition group-hover:rotate-6 group-hover:scale-110">🔔</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl tracking-tight">{u.title}</h3>
                          {u.fresh && (
                            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1a0e02]">new</span>
                          )}
                          <span className="text-xs text-slate-500">{u.date}</span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{u.body}</p>
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {/* ------------------------------ REFERRALS ------------------------------ */}
              {tab === "referrals" && <ReferralDashboard />}

              {/* ------------------------------ DOWNLOADS ------------------------------ */}
              {tab === "downloads" && (
                <section className="space-y-5">
                  <SectionTitle eyebrow="Downloads" title="Files shared by the admin" sub="Toolkits and editor packs appear here the moment the admin uploads them." />
                  <div className="grid gap-4 md:grid-cols-2">
                    {liveFiles.map(f => ({ name: f.title, size: "", kind: f.body, shared: "Available now", url: f.url })).map((f, i) => (
                      <article
                        key={f.name}
                        className={`${card} rise group p-6 hover:-translate-y-1.5 hover:border-amber-400/40 hover:shadow-[0_24px_60px_-18px_rgba(251,191,36,0.3)]`}
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-2xl transition group-hover:scale-110 group-hover:-rotate-3">📦</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">zip</span>
                        </div>
                        <h3 className="mt-4 break-all font-semibold text-slate-100">{f.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{f.kind}</p>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                          <span>{f.size} · {f.shared}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              spawnRipple(e);
                              if (f.url) window.open(f.url, "_blank", "noopener,noreferrer");
                              else showToast(`Download link for ${f.name} has not been configured.`);
                            }}
                            className="relative overflow-hidden rounded-full border border-amber-400/60 px-4 py-1.5 font-semibold text-amber-300 transition hover:bg-amber-400 hover:text-[#1a0e02]"
                          >
                            Download ↓
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* -------------------------------- VIDEOS -------------------------------- */}
              {tab === "videos" && (
                <section className="space-y-5">
                  <SectionTitle eyebrow="Videos" title="Watch & learn" sub="Video links published by the admin — click a card to watch." />
                  <div className="grid gap-4 md:grid-cols-3">
                    {liveVideos.map(v => ({ title: v.title, duration: "WATCH", hue: "from-[#6d28d9] to-[#22D3EE]", url: v.url })).map((v, i) => (
                      <button
                        key={v.title}
                        type="button"
                        onClick={() => v.url ? window.open(v.url, "_blank", "noopener,noreferrer") : showToast("This demo tutorial has no video URL yet.")}
                        className={`${card} rise group overflow-hidden text-left hover:-translate-y-1.5 hover:border-amber-400/40 hover:shadow-[0_24px_60px_-18px_rgba(251,191,36,0.3)]`}
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className={`relative grid aspect-video place-items-center bg-gradient-to-br ${v.hue}`}>
                          <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]" />
                          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-110">
                            <svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true">
                              <path d="M2 2.5v19L20 12z" fill="#070B18" />
                            </svg>
                          </span>
                          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">{v.duration}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold leading-snug text-slate-100 transition group-hover:text-amber-300">{v.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">From the admin · LOGGYFORGE tutorials</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* -------------------------------- CONTACT -------------------------------- */}
              {tab === "contact" && (
                <section className="space-y-5">
                  <SectionTitle eyebrow="Contact" title="Message the admin" sub="Questions about your account, earnings or files? Send a note and you'll get a reply." />
                  <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                    <div className={`${card} p-6`}>
                      {sent ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <span className="rise grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300">✓</span>
                          <h3 className="mt-4 font-display text-2xl tracking-tight">Message sent</h3>
                          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
                            The admin received your message and will reply to <strong className="text-slate-200">{form.email || "your email"}</strong> soon.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSent(false);
                              setForm({ name: "", email: "", message: "" });
                            }}
                            className="mt-5 rounded-full border border-white/15 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"
                          >
                            Send another
                          </button>
                        </div>
                      ) : (
                        <form
                          className="space-y-3.5"
                          onSubmit={async (e) => {
                            e.preventDefault(); setMessageBusy(true);
                            try {
                              const response = await fetch("/api/content/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
                              const data = await readJson(response); if (!response.ok) throw new Error(data.error || "Message could not be sent.");
                              setSent(true);
                            } catch (error) { showToast(error instanceof Error ? error.message : "Message could not be sent."); }
                            finally { setMessageBusy(false); }
                          }}
                        >
                          <div className="grid gap-3.5 sm:grid-cols-2">
                            <label className="block">
                              <span className={labelCls}>Name</span>
                              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className={inputCls} />
                            </label>
                            <label className="block">
                              <span className={labelCls}>Email</span>
                              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className={inputCls} />
                            </label>
                          </div>
                          <label className="block">
                            <span className={labelCls}>Message</span>
                            <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can the admin help you?" className={`${inputCls} resize-none`} />
                          </label>
                          <button
                            type="submit"
                            onClick={spawnRipple}
                            className="shimmer relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[#1a0e02] shadow-[0_18px_40px_-10px_rgba(255,140,26,0.55)] transition hover:-translate-y-0.5 sm:w-auto sm:px-8"
                          >
                            {messageBusy ? "Sending…" : "Send message"} <span className="arrow-nudge">→</span>
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className={`${card} p-5`}>
                        <h3 className="font-display text-xl tracking-tight">Direct channels</h3>
                        <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                          <li className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5">📧</span>
                            admin@loggyforge.app
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5">💬</span>
                            In-app chat · replies within 24h
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5">🕘</span>
                            Mon–Sat · 09:00–18:00
                          </li>
                        </ul>
                      </div>
                      <div className="card-sheen rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-orange-600/10 p-5 backdrop-blur-md">
                        <h3 className="font-display text-xl tracking-tight text-white">Need it faster?</h3>
                        <p className="mt-1.5 text-sm text-slate-300">
                          Include your referral code <span className="font-mono font-bold text-amber-300">{REFERRAL_CODE}</span> in any message so the admin can find your account quickly.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 bg-black/40 py-2.5 backdrop-blur-sm">
            <div className="marquee whitespace-nowrap">
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
                <span key={i} className="mx-6 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  <span className="text-amber-500">◆</span> {item}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* toast */}
      {toast && (
        <div className="toast-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-400/40 bg-[#101830]/95 px-5 py-3 text-sm font-medium text-white shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
