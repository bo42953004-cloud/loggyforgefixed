import Link from "next/link";
import Backdrop from "@/components/theme/Backdrop";
import CountUp from "@/components/theme/CountUp";
import Reveal from "@/components/theme/Reveal";
import TerminalCard, { type TermLine } from "@/components/theme/TerminalCard";
import LangLogo from "@/components/studio/LangLogo";
import SiteMark from "@/components/theme/SiteMark";
import SiteAbout from "@/components/theme/SiteAbout";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#languages", label: "Languages" },
  { href: "#about", label: "About" }, { href: "#faq", label: "FAQ" },
];

const TERMINAL: TermLine[] = [
  { text: "$ loggyforge build --type cafe", tone: "text-[#8BE9FD]" },
  { text: "▸ writing index.html", tone: "text-[#9DCEFF]" },
  { text: "▸ styling styles.css", tone: "text-[#9DCEFF]" },
  { text: "▸ wiring script.js", tone: "text-[#9DCEFF]" },
  { text: "✓ live preview ready", tone: "text-[#50FA7B]" },
];

const STATS: { value: number; label: string }[] = [
  { value: 8, label: "languages" },
  { value: 200, label: "lines per burst" },
  { value: 3, label: "files wired together" },
  { value: 0, label: "installs needed" },
];

const FEATURES: { icon: string; title: string; text: string; glow: string }[] = [
  {
    icon: "🧑‍💻",
    title: "Code Studio",
    text: "A VS Code-style workspace: Monaco editor, tabs, breadcrumbs, a live preview and an output panel.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(251,191,36,0.35)]",
  },
  {
    icon: "⌨️",
    title: "Typewriter writer",
    text: "Code is typed character by character at the words-per-minute you set, like a human at the keyboard.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(52,211,153,0.35)]",
  },
  {
    icon: "📊",
    title: "Spreadsheet",
    text: "Excel-style cells with real formulas, a plain-English task agent and continuous computing.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(56,189,248,0.35)]",
  },
  {
    icon: "🔁",
    title: "Non-stop mode",
    text: "Writes a burst, deletes part of it, then keeps going — HTML, CSS and JS stay wired the whole time.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(167,139,250,0.35)]",
  },
  {
    icon: "🌙",
    title: "Keep-awake",
    text: "A browser wake lock keeps the display on while the writer runs, so you can step away.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(251,113,133,0.35)]",
  },
  {
    icon: "🚀",
    title: "Publish-ready",
    text: "A clean Next.js + PostgreSQL app you can deploy to Vercel in minutes.",
    glow: "hover:shadow-[0_24px_60px_-18px_rgba(251,146,60,0.35)]",
  },
];

const STEPS: [string, string][] = [
  ["Open the studio", "Nothing to install. It runs in your browser and saves your work to PostgreSQL."],
  ["Describe the build", "Pick a project type, write one sentence, and press “Build attractive website”."],
  ["Watch it type", "Code appears character by character while the live preview styles it and brings it to life."],
];

const LANGS = ["html", "css", "js", "python", "typescript", "json", "markdown", "sql"] as const;
const LANG_LABEL: Record<(typeof LANGS)[number], string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  json: "JSON",
  markdown: "Markdown",
  sql: "SQL",
};

const FAQ: [string, string][] = [
  ["Do I need to install anything?", "No. The studio runs entirely in your browser. If you prefer your own editor, the optional VS Code extension brings the same writer into VS Code."],
  ["Which languages can it write?", "HTML, CSS, JavaScript, Python, TypeScript, JSON, Markdown and SQL — each with its own logo in the explorer and tabs."],
  ["What does “non-stop” mean?", "You choose a burst size and a delete percentage. The writer produces a burst of lines, removes part of it, then continues — cycle after cycle — until you press Stop."],
  ["Does the live preview really work?", "Yes. styles.css and script.js are wired into index.html automatically, so every card the writer produces is styled and interactive the moment it lands."],
  ["Can I save my projects?", "Yes. Projects and spreadsheets are stored in PostgreSQL, and spreadsheets can be exported to CSV."],
];

const MARQUEE = [
  "Typewriter engine", "8 languages", "Live preview", "Non-stop writer", "PostgreSQL persistence",
  "Referral earnings", "Screen wake-lock", "VS Code semantics", "One-click Vercel deploy",
];

const primaryBtn =
  "shimmer inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-[#1a0e02] shadow-[0_18px_45px_-10px_rgba(255,140,26,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-10px_rgba(255,140,26,0.65)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:text-amber-300";

function Heading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">{eyebrow}</p>
      <h2 className="mt-2 font-display text-[clamp(2rem,4.2vw,3.2rem)] leading-[1.05] tracking-[-0.02em]">{title}</h2>
      {sub && <p className="mt-3 text-slate-400">{sub}</p>}
    </div>
  );
}

/** Landing page — same cinematic look as the login page. */
export default function HomePage() {
  return (
    <div className="relative min-h-screen font-body text-white antialiased">
      <Backdrop />

      <div className="relative z-10">
        {/* ------------------------------ nav ------------------------------ */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070B18]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-widest text-white/85 transition hover:text-white">
              <SiteMark className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg shadow-[0_0_22px_rgba(255,140,26,0.55)]" />
              LOGGY<span className="text-amber-400">FORGE</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="transition hover:text-amber-300">
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2.5">
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-amber-300 sm:block">
                Sign in
              </Link>
              <Link href="/login" className="shimmer rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a0e02] shadow-[0_10px_28px_-8px_rgba(255,140,26,0.6)] transition hover:-translate-y-0.5">
                Enter platform →
              </Link>
            </div>
          </div>
        </header>

        {/* ------------------------------ hero ------------------------------ */}
        <section className="relative">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-[1.15fr_1fr]">
            <div className="relative">
              {/* floating chips */}
              <div aria-hidden className="pointer-events-none absolute -top-6 right-0 hidden select-none lg:block">
                <span className="float-up absolute right-4 top-0 whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-cyan-300 backdrop-blur-sm">{"</> shipped"}</span>
              </div>

              <span className="rise inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                <span className="pulse-ring inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                AI workspace · runs in your browser
              </span>

              <h1 className="rise mt-6 font-display text-[clamp(2.8rem,6.4vw,5rem)] leading-[1.02] tracking-[-0.02em]" style={{ animationDelay: "80ms" }}>
                Write code that
                <br />
                <span className="gradient-pan">never sleeps.</span>
              </h1>

              <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-slate-300" style={{ animationDelay: "160ms" }}>
                Describe the website you want and watch it type itself out — or let the non-stop writer
                produce HTML, CSS, JavaScript and five more languages, burst after burst.
              </p>

              <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
                <Link href="/login" className={primaryBtn}>
                  Enter the platform <span className="arrow-nudge">→</span>
                </Link>
                <Link href="/sheet" className={ghostBtn}>
                  Try the spreadsheet
                </Link>
              </div>
            </div>

            <div className="rise relative" style={{ animationDelay: "200ms" }}>
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="spin-slower h-[420px] w-[420px] rounded-full border border-dashed border-white/10" />
              </div>
              <span aria-hidden className="float-up absolute -left-3 -top-5 z-10 hidden rounded-full border border-white/15 bg-[#0d1426]/80 px-3 py-1.5 font-mono text-[11px] text-emerald-300 backdrop-blur-sm sm:block">✦ AI writer</span>
              <span aria-hidden className="float-up absolute -bottom-4 right-2 z-10 hidden rounded-full border border-white/15 bg-[#0d1426]/80 px-3 py-1.5 font-mono text-[11px] text-violet-300 backdrop-blur-sm sm:block" style={{ animationDelay: "-3s" }}>⚡ 8 languages</span>
              <TerminalCard lines={TERMINAL} title="loggyforge — build" />
            </div>
          </div>

          {/* stats */}
          <div className="mx-auto max-w-7xl px-6 pb-16">
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="card-sheen rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-md transition hover:-translate-y-1 hover:border-amber-400/40">
                  <dd className="font-display text-4xl text-white">
                    <CountUp target={s.value} duration={1200} />
                  </dd>
                  <dt className="mt-0.5 text-xs uppercase tracking-widest text-slate-500">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------- features ---------------------------- */}
        <section id="features" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal>
              <Heading eyebrow="What you get" title="Everything in one workspace" sub="Two tools, one idea: code that writes itself and cells that compute themselves." />
            </Reveal>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 70}>
                  <article className={`card-sheen group h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-white/25 ${f.glow}`}>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl transition group-hover:scale-110 group-hover:rotate-3">{f.icon}</span>
                    <h3 className="mt-4 font-display text-2xl tracking-tight">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------- how it works --------------------------- */}
        <section id="how" className="scroll-mt-20 border-y border-white/10 bg-black/25 py-16 backdrop-blur-sm md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal>
              <Heading eyebrow="How it works" title="Three steps, zero setup" />
            </Reveal>
            <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
              <div aria-hidden className="absolute left-[16%] right-[16%] top-[34px] hidden h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent md:block" />
              {STEPS.map(([title, text], i) => (
                <Reveal key={title} delay={i * 110}>
                  <li className="card-sheen relative h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md transition hover:-translate-y-1 hover:border-amber-400/40">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 font-display text-xl text-[#1a0e02] shadow-[0_0_24px_rgba(255,140,26,0.5)]">{i + 1}</span>
                    <h3 className="mt-4 font-display text-2xl tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------- languages ---------------------------- */}
        <section id="languages" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
                <Heading eyebrow="Languages" title="Eight languages, one writer" sub="Each has its own logo in the explorer, tabs and status bar. Pick one — or run the three web languages together." />
                <Link href="/login" className={primaryBtn}>
                  Start writing <span className="arrow-nudge">→</span>
                </Link>
              </div>
            </Reveal>

            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {LANGS.map((lang, i) => (
                <Reveal key={lang} delay={i * 50}>
                  <li className="card-sheen flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-5 text-center backdrop-blur-md transition hover:-translate-y-1.5 hover:border-amber-400/40 hover:shadow-[0_18px_40px_-14px_rgba(251,191,36,0.3)]">
                    <LangLogo lang={lang} size={32} />
                    <span className="text-xs font-semibold text-slate-300">{LANG_LABEL[lang]}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------ CTA ------------------------------ */}
        <section className="px-6 pb-16 md:pb-24">
          <Reveal>
            <div className="card-sheen relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-amber-400/25 bg-[#0d1426]/80 px-6 py-14 text-center backdrop-blur-xl md:py-20">
              <div aria-hidden className="aurora left-[-8%] top-[-40%] h-[320px] w-[420px] bg-[#ff6a00]/40" />
              <div aria-hidden className="aurora bottom-[-50%] right-[-6%] h-[320px] w-[420px] bg-[#6d28d9]/40" style={{ animationDelay: "-5s" }} />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.04] tracking-[-0.02em]">
                  Open it. <span className="gradient-pan">Right now.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-slate-300">Your first website is one sentence away. No install, no setup.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/login" className={primaryBtn}>
                    Enter the platform <span className="arrow-nudge">→</span>
                  </Link>
                  <Link href="/sheet" className={ghostBtn}>
                    Open spreadsheet
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ------------------------------- FAQ ------------------------------- */}
        <SiteAbout />
        <section id="faq" className="scroll-mt-20 border-t border-white/10 bg-black/25 py-16 backdrop-blur-sm md:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <Heading eyebrow="FAQ" title="Questions, answered" />
            </Reveal>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="flex items-center justify-between gap-4 text-left font-medium text-slate-100 transition hover:text-amber-300">
                    {q}
                    <span className="faq-chevron grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-300 transition-transform duration-300">+</span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-relaxed text-slate-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ marquee + footer ------------------------------ */}
        <div className="border-t border-white/10 bg-black/40 py-2.5 backdrop-blur-sm">
          <div className="marquee whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((item, i) => (
              <span key={i} className="mx-6 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <span className="text-amber-500">◆</span> {item}
              </span>
            ))}
          </div>
        </div>

        <footer className="border-t border-white/10 bg-black/30">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-10 sm:flex-row">
            <span className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-widest text-white/80">
              <SiteMark className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600" />
              LOGGY<span className="text-amber-400">FORGE</span>
            </span>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="transition hover:text-amber-300">
                  {n.label}
                </a>
              ))}
              <Link href="/studio" className="transition hover:text-amber-300">Studio</Link>
              <Link href="/sheet" className="transition hover:text-amber-300">Spreadsheet</Link>
            </nav>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} LOGGYFORGE</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
