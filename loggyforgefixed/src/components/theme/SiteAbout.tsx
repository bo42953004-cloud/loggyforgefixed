"use client";

import { useEffect, useState } from "react";

/** The About section on the landing page. Its text comes from Admin → Site & branding. */
export default function SiteAbout() {
  const [about, setAbout] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/site", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { about?: string; tagline?: string }) => {
        if (alive) { setAbout(d.about ?? ""); setTagline(d.tagline ?? ""); }
      })
      .catch(() => {
        if (alive) setAbout("");
      });
    return () => {
      alive = false;
    };
  }, []);

  const paragraphs = (about ?? "").split(/\n+/).filter(Boolean);
  return (
    <section id="about" className="scroll-mt-20 border-t border-white/10 bg-black/25 py-16 backdrop-blur-sm md:py-24">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">About</p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight text-white">Who we are</h2>
        {tagline && <p className="mt-2 text-sm text-amber-300">{tagline}</p>}
        <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-base leading-relaxed text-slate-300">
          {about === null ? <p className="text-slate-500">Loading…</p> : paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </section>
  );
}
