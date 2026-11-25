"use client";

import { useEffect, useState } from "react";

export interface TermLine {
  text: string;
  tone: string;
}

/** A glass terminal that types its lines out, loops, and tilts toward the mouse. */
export default function TerminalCard({
  lines,
  title = "loggyforge — session",
  footer = "UTF-8 · LF · TypeScript",
  className = "",
}: {
  lines: TermLine[];
  title?: string;
  footer?: string;
  className?: string;
}) {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (line >= lines.length) {
      // finished: hold for a moment, then replay
      const t = window.setTimeout(() => {
        setLine(0);
        setChars(0);
      }, 4200);
      return () => window.clearTimeout(t);
    }
    const full = lines[line].text;
    if (chars < full.length) {
      const t = window.setTimeout(() => setChars((c) => c + 1), 24 + Math.random() * 34);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      setLine((l) => l + 1);
      setChars(0);
    }, 420);
    return () => window.clearTimeout(t);
  }, [line, chars, lines]);

  const active = lines[line];

  return (
    <div
      className={`card-sheen relative rounded-2xl border border-white/10 bg-[#0d1426]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md ${className}`}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        setTilt({ x: -y * 6, y: x * 8 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.16s ease-out",
      }}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">{title}</span>
      </div>
      <div className="min-h-[132px] space-y-1.5 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
        {lines.slice(0, line).map((l) => (
          <p key={l.text} className={l.tone}>
            {l.text}
          </p>
        ))}
        {active ? (
          <p className={active.tone}>
            {active.text.slice(0, chars)}
            <span className="terminal-caret ml-0.5" />
          </p>
        ) : (
          <p className="text-slate-500">
            loggyforge ▮ <span className="terminal-caret ml-0.5" />
          </p>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-slate-500">
        <span>{footer}</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="pulse-ring inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> live
        </span>
      </div>
    </div>
  );
}
