import type { LangId } from "@/lib/studio/languages";

/** Small official-style logo for each supported language, drawn as inline SVG. */
const KNOWN: LangId[] = ["html", "css", "js", "python", "typescript", "json", "markdown", "sql"];

export default function LangLogo({ lang, size = 16 }: { lang: string; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  const key = (KNOWN as string[]).includes(lang) ? (lang as LangId) : "markdown";
  switch (key) {
    case "html":
      return (
        <svg {...s}>
          <path fill="#e34f26" d="M3 2h18l-1.6 18L12 22l-7.4-2z" />
          <path fill="#ef652a" d="M12 3.5V20.5l6-1.6L19.4 3.5z" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial">5</text>
        </svg>
      );
    case "css":
      return (
        <svg {...s}>
          <path fill="#1572b6" d="M3 2h18l-1.6 18L12 22l-7.4-2z" />
          <path fill="#33a9dc" d="M12 3.5V20.5l6-1.6L19.4 3.5z" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial">3</text>
        </svg>
      );
    case "js":
      return (
        <svg {...s}>
          <rect width="24" height="24" rx="3" fill="#f7df1e" />
          <text x="12" y="17" textAnchor="middle" fontSize="10" fontWeight="800" fill="#000" fontFamily="Arial">JS</text>
        </svg>
      );
    case "typescript":
      return (
        <svg {...s}>
          <rect width="24" height="24" rx="3" fill="#3178c6" />
          <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Arial">TS</text>
        </svg>
      );
    case "python":
      return (
        <svg {...s}>
          <path fill="#3776ab" d="M12 2c-3 0-4.5 1.3-4.5 3v2.5H12v1H5.5C3.6 8.5 2 10 2 12s1.6 3.5 3.5 3.5H7v-2.6c0-1.9 1.6-3.4 3.5-3.4h5c1.6 0 3-1.3 3-3V5c0-1.7-1.5-3-4.5-3z" />
          <path fill="#ffd43b" d="M12 22c3 0 4.5-1.3 4.5-3v-2.5H12v-1h6.5c1.9 0 3.5-1.5 3.5-3.5s-1.6-3.5-3.5-3.5H17v2.6c0 1.9-1.6 3.4-3.5 3.4h-5c-1.6 0-3 1.3-3 3V19c0 1.7 1.5 3 4.5 3z" />
          <circle cx="9.5" cy="5" r="1.1" fill="#fff" />
          <circle cx="14.5" cy="19" r="1.1" fill="#fff" />
        </svg>
      );
    case "json":
      return (
        <svg {...s}>
          <rect width="24" height="24" rx="5" fill="#292929" />
          <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#f5c518" fontFamily="monospace">{`{ }`}</text>
        </svg>
      );
    case "markdown":
      return (
        <svg {...s}>
          <rect x="1" y="4" width="22" height="16" rx="3" fill="#4b5563" />
          <path fill="#fff" d="M5 16V8l3 3.4L11 8v8h-2v-4.4L7 14l-2-2.4V16zm11.5 0-2.5-4.5h1.8l1.2 2.4 1.2-2.4h1.8L19 16z" />
        </svg>
      );
    case "sql":
      return (
        <svg {...s}>
          <ellipse cx="12" cy="5.5" rx="8" ry="3" fill="#0e7490" />
          <path fill="#155e75" d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13c0 1.7-3.6 3-8 3s-8-1.3-8-3z" />
          <path fill="#22d3ee" d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3v3c0 1.7-3.6 3-8 3s-8-1.3-8-3z" opacity="0.85" />
        </svg>
      );
    default:
      return (
        <span
          style={{
            fontSize: size * 0.6,
            fontWeight: 800,
            color: "#858585",
            border: "1px solid #3c3c3c",
            borderRadius: 4,
            padding: "1px 3px",
          }}
        >
          {String(lang).slice(0, 2).toUpperCase()}
        </span>
      );
  }
}
