"use client";

import Link from "next/link";
import SiteMark from "@/components/theme/SiteMark";
import BrandLoader from "@/components/theme/BrandLoader";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/safe-json";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

const TERMINAL_LINES = [
  { text: "$ loggyforge --open", tone: "text-[#8BE9FD]" },
  { text: "▸ loading studio workspace…", tone: "text-[#9DCEFF]" },
  { text: "▸ warming the typewriter engine", tone: "text-[#9DCEFF]" },
  { text: "✓ ready — let's build something", tone: "text-[#50FA7B]" },
];

const MARQUEE = [
  "Typewriter engine", "8 languages", "Live preview", "Non-stop writer", "PostgreSQL persistence",
  "Referral earnings", "Screen wake-lock", "VS Code semantics", "One-click Vercel deploy",
];

function CountUp({ target, suffix = "", duration = 1400 }: { target: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -8 * t) / 255;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span>{value.toLocaleString()}{suffix}</span>;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const moveFrame = useRef<number | null>(null);

  // self-typing terminal effect
  useEffect(() => {
    if (currentLine >= TERMINAL_LINES.length) return;
    const full = TERMINAL_LINES[currentLine].text;
    if (charCount < full.length) {
      const t = window.setTimeout(() => setCharCount((c) => c + 1), 26 + Math.random() * 34);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setTypedLines((prev) => [...prev, full]);
      setCurrentLine((l) => l + 1);
      setCharCount(0);
    }, 420);
    return () => window.clearTimeout(t);
  }, [charCount, currentLine]);

  const activeLine = TERMINAL_LINES[currentLine];
  const activeTyped = activeLine ? activeLine.text.slice(0, charCount) : "";

  // mouse parallax for the left scene
  const onSceneMove = (e: MouseEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 700px)").matches) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1..1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    if (moveFrame.current !== null) return;
    moveFrame.current = window.requestAnimationFrame(() => {
      setPointer({ x, y });
      setTilt({ x: -y * 7, y: x * 9 });
      moveFrame.current = null;
    });
  };

  const onSceneLeave = () => {
    if (moveFrame.current !== null) window.cancelAnimationFrame(moveFrame.current);
    moveFrame.current = null;
    setPointer({ x: 0, y: 0 });
    setTilt({ x: 0, y: 0 });
  };

  const spawnRipple = (e: MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  };

  const enter = async (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setSubmitting(true); setLoginError("");
    try {
      const response = await fetch("/api/member/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "Sign in failed.");
      router.replace("/dashboard"); router.refresh();
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  };

  const parallax = (depth: number): CSSProperties => ({
    transform: `translate3d(${pointer.x * depth}px, ${pointer.y * depth}px, 0)`,
    transition: "transform 0.18s ease-out",
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B18] font-body text-white">
      {/* ======== background: starfield + aurora + perspective grid ======== */}
      <div aria-hidden className="starfield pointer-events-none absolute inset-0" />
      <div aria-hidden className="aurora left-[-10%] top-[-15%] h-[520px] w-[560px] bg-[#ff6a00]/50" />
      <div aria-hidden className="aurora right-[-12%] top-[8%] h-[460px] w-[520px] bg-[#6d28d9]/55" style={{ animationDelay: "-4s" }} />
      <div aria-hidden className="aurora bottom-[-20%] left-[28%] h-[500px] w-[620px] bg-[#0ea5e9]/40" style={{ animationDelay: "-8s" }} />
      <div aria-hidden className="perspective-grid" />
      {/* soft vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(3,6,17,0.72)_100%)]" />

      <div
        ref={sceneRef}
        onMouseMove={onSceneMove}
        onMouseLeave={onSceneLeave}
        className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_1fr]"
      >
        {/* ================= LEFT — the spectacle ================= */}
        <section className="relative flex flex-col justify-center gap-6 px-6 pb-10 pt-10 sm:px-10 lg:pb-14 lg:pt-14">
          {/* floating chips that drift with the mouse */}
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none lg:block">
            <span className="float-up absolute left-[9%] top-[12%] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-amber-300 backdrop-blur-sm" style={parallax(26)}>
              ⌨ 30 WPM
            </span>
            <span className="float-up absolute right-[16%] top-[22%] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-cyan-300 backdrop-blur-sm" style={{ ...parallax(34), animationDelay: "-2s" }}>
              {"</> shipped"}
            </span>
            <span className="float-up absolute left-[14%] top-[42%] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-emerald-300 backdrop-blur-sm" style={{ ...parallax(40), animationDelay: "-3.4s" }}>
              ✦ AI writer
            </span>
            <span className="float-up absolute right-[11%] top-[55%] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-rose-300 backdrop-blur-sm" style={{ ...parallax(22), animationDelay: "-1.2s" }}>
              v1.0 live
            </span>
            <span className="float-up absolute bottom-[16%] left-[30%] rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-violet-300 backdrop-blur-sm" style={{ ...parallax(30), animationDelay: "-4s" }}>
              ⚡ 8 languages
            </span>
          </div>

          <Link href="/" className="relative inline-flex w-fit items-center gap-2.5 text-sm font-semibold tracking-widest text-white/80 transition hover:text-white">
            <SiteMark className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg shadow-[0_0_22px_rgba(255,140,26,0.55)]" />
            LOGGY<span className="text-amber-400">FORGE</span>
          </Link>

          <h1 className="relative max-w-xl font-display text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[1.02] tracking-[-0.02em]">
            Write code that
            <br />
            <span className="gradient-pan">never sleeps.</span>
          </h1>

          <p className="relative max-w-md text-base leading-relaxed text-slate-300">
            An AI workspace that types like a human, previews live, and ships your product —
            built for <span className="font-semibold text-amber-300">Loggy</span>, the engineer
            training rig where every keystroke counts.
          </p>

          {/* terminal card with live typing */}
          <div className="card-sheen relative mt-1 max-w-md rounded-2xl border border-white/10 bg-[#0d1426]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md" style={tilt ? { transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform 0.16s ease-out" } : undefined}>
            <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">loggyforge — session</span>
            </div>
            <div className="min-h-[118px] space-y-1.5 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
              {typedLines.map((line, i) => (
                <p key={i} className={TERMINAL_LINES.find((l) => l.text === line)?.tone ?? "text-slate-300"}>
                  {line}
                </p>
              ))}
              {activeLine && (
                <p className={activeLine.tone}>
                  {activeTyped}
                  <span className="terminal-caret ml-0.5" />
                </p>
              )}
              {!activeLine && (
                <p className="text-slate-500">
                  loggyforge ▮ <span className="terminal-caret ml-0.5" />
                </p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500">
              <span>UTF-8 · LF · TypeScript</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="pulse-ring inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> live
              </span>
            </div>
          </div>

          {/* social proof counters */}
          <dl className="relative flex flex-wrap gap-x-8 gap-y-3 pt-1 text-slate-300">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Builders onboard</dt>
              <dd className="font-display text-3xl text-white"><CountUp target={2314} /></dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Lines typed by AI</dt>
              <dd className="font-display text-3xl text-white"><CountUp target={1842931} /></dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">Deploys shipped</dt>
              <dd className="font-display text-3xl text-white"><CountUp target={918} /></dd>
            </div>
          </dl>
        </section>

        {/* ================= RIGHT — the sign-in card ================= */}
        <section className="relative flex items-center justify-center px-6 pb-12 pt-2 sm:px-10 lg:py-12">
          {/* orbiting rings behind the card */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="spin-slower h-[540px] w-[540px] rounded-full border border-dashed border-white/10" />
          </div>
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

          <form
            className="card-sheen relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#101830]/80 p-6 shadow-[0_40px_90px_-25px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-7"
            onSubmit={(e) => { e.preventDefault(); void enter(); }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">Member access</p>
            <h2 className="mt-1.5 font-display text-3xl text-white">Welcome back,<br /><span className="gradient-pan">builder.</span></h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Enter the studio where Loggyforge never stops typing.</p>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@loggyforge.dev"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-400/10"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">Password</span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-400/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-amber-300"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.9 17.9 6.1 6.1" /><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a18.4 18.4 0 0 1-3.2 4.4" /><path d="M6.6 6.6A18 18 0 0 0 1 12s4 8 11 8a10.4 10.4 0 0 0 4.4-.9" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </span>
            </label>

            {loginError && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">{loginError}</p>}
            <button
              type="submit"
              disabled={submitting}
              onClick={spawnRipple}
              className="relative mt-6 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1a0e02] shadow-[0_18px_45px_-10px_rgba(255,140,26,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-10px_rgba(255,140,26,0.65)] disabled:cursor-wait disabled:opacity-80"
            >
              {submitting ? (
                <>
                  <span className="login-brand-loader" aria-hidden="true">◆</span>
                  Entering LOGGYFORGE…
                </>
              ) : (
                <>
                  Enter the platform
                  <svg className="arrow-nudge h-4 w-5" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 8h17M12 2l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>

            <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
              New to LOGGYFORGE? <Link href="/register" className="text-amber-300 hover:text-amber-200">Create an account</Link>
            </p>
          </form>
        </section>
      </div>

      {/* ======== bottom marquee ======== */}
      <div className="relative border-t border-white/5 bg-black/40 py-2.5 backdrop-blur-sm">
        <div className="flex w-max marquee whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="mx-6 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <SiteMark className="text-amber-500" /> {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
