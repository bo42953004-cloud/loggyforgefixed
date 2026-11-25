import type { LangId } from "./languages";

export type SnippetLanguage = LangId;

const STOP_WORDS = new Set([
  "make", "build", "create", "website", "site", "page", "with", "that", "this", "for", "the",
  "and", "a", "an", "my", "our", "please", "write", "code", "modern", "beautiful", "attractive",
  "simple", "web", "some", "about", "landing", "dashboard", "game", "blog",
]);

/** Picks a short identifier-safe word from the prompt, used to name generated code. */
export function themeFromPrompt(prompt: string): string {
  const words = (prompt.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (w) => w.length > 2 && !STOP_WORDS.has(w),
  );
  return words[0] ?? "app";
}

/**
 * Animated web card N. The same number N is used in all three files, so the HTML card,
 * its CSS rule and its script stay wired together in the live preview:
 * - HTML: a <section class="{theme}-card-N reveal"> with badge, meter, button and output.
 * - CSS:  the matching rule plus keyframes (rise / grow) and hover + reveal animations,
 *         exactly the animation style the "Build attractive website" button produces.
 * - JS:   an IIFE that reveals the card on scroll (IntersectionObserver), animates the meter
 *         and recomputes the output when the button is clicked.
 * Every block ends with a blank line so deletions snap to whole blocks.
 */
function webBlock(language: "html" | "css" | "js", theme: string, n: number): string[] {
  const title = theme.charAt(0).toUpperCase() + theme.slice(1);
  const cls = `${theme}-card-${n}`;
  const hue = (n * 37) % 360;
  const w = 30 + ((n * 13) % 65);

  if (language === "js") {
    return [
      `// ${title} card ${n}: reveal on scroll, animate the meter, recompute on click`,
      `(function () {`,
      `  var card = document.querySelector('.${cls}');`,
      `  if (!card) return;`,
      `  var out = card.querySelector('output');`,
      `  var btn = card.querySelector('button');`,
      `  var meter = card.querySelector('.${theme}-meter-${n} span');`,
      ``,
      `  if ('IntersectionObserver' in window) {`,
      `    var io = new IntersectionObserver(function (entries) {`,
      `      entries.forEach(function (e) { if (e.isIntersecting) { card.classList.add('visible'); io.disconnect(); } });`,
      `    }, { threshold: 0.15 });`,
      `    io.observe(card);`,
      `  } else {`,
      `    card.classList.add('visible');`,
      `  }`,
      ``,
      `  function ping() {`,
      `    var value = (${n} * 7 + Date.now() % 100) % 997;`,
      `    if (out) out.textContent = value;`,
      `    card.classList.add('pulse');`,
      `    setTimeout(function () { card.classList.remove('pulse'); }, 450);`,
      `  }`,
      `  if (btn) btn.addEventListener('click', ping);`,
      `  if (meter) meter.style.width = '${w}%';`,
      `  ping();`,
      `})();`,
      ``,
    ];
  }

  if (language === "css") {
    return [
      `/* ${title} card ${n} — animated like the generated websites */`,
      `@keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }`,
      `@keyframes grow { from { width: 0; } }`,
      `.reveal { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s ease; }`,
      `.reveal.visible { opacity: 1; transform: none; }`,
      `.${cls} {`,
      `  position: relative;`,
      `  display: flex;`,
      `  flex-wrap: wrap;`,
      `  align-items: center;`,
      `  gap: 12px;`,
      `  max-width: 720px;`,
      `  margin: 14px auto;`,
      `  padding: 18px 22px;`,
      `  border-radius: 16px;`,
      `  background: linear-gradient(135deg, hsl(${hue} 80% 96%), hsl(${(hue + 40) % 360} 80% 92%));`,
      `  border-left: 6px solid hsl(${hue} 80% 45%);`,
      `  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.10);`,
      `  font-family: system-ui, sans-serif;`,
      `  color: hsl(${hue} 50% 18%);`,
      `  animation: rise .6s ease both;`,
      `  transition: transform .25s ease, box-shadow .25s ease;`,
      `}`,
      `.${cls}:hover { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(15, 23, 42, 0.16); }`,
      `.${cls}.pulse { outline: 3px solid hsl(${hue} 80% 50%); }`,
      `.${theme}-badge-${n} {`,
      `  display: grid;`,
      `  place-items: center;`,
      `  width: 40px; height: 40px;`,
      `  border-radius: 12px;`,
      `  background: linear-gradient(135deg, hsl(${hue} 85% 55%), hsl(${(hue + 60) % 360} 85% 50%));`,
      `  color: #fff; font-weight: 800;`,
      `}`,
      `.${cls} h3 { margin: 0; flex: 1 1 100%; font-size: 1.05rem; }`,
      `.${cls} p { margin: 0; flex: 1 1 240px; font-size: 0.9rem; opacity: 0.85; }`,
      `.${theme}-meter-${n} { flex: 1 1 100%; height: 8px; border-radius: 999px; background: rgba(0,0,0,0.08); overflow: hidden; }`,
      `.${theme}-meter-${n} span { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, hsl(${hue} 80% 50%), hsl(${(hue + 60) % 360} 80% 55%)); animation: grow 1.1s ease both; transition: width .5s ease; }`,
      `.${cls} button { border: 0; border-radius: 999px; padding: 7px 16px; background: hsl(${hue} 80% 42%); color: #fff; font-weight: 600; cursor: pointer; transition: transform .2s ease, filter .2s ease; }`,
      `.${cls} button:hover { transform: scale(1.06); filter: brightness(1.08); }`,
      `.${cls} output { font-weight: 700; font-variant-numeric: tabular-nums; }`,
      ``,
    ];
  }

  return [
    `<section class="${cls} reveal">`,
    `  <span class="${theme}-badge-${n}">${n}</span>`,
    `  <h3>${title} #${n}</h3>`,
    `  <p>Animated block ${n} for ${theme}: styled by styles.css, brought to life by script.js.</p>`,
    `  <div class="${theme}-meter-${n}"><span style="--w:${w}%"></span></div>`,
    `  <button type="button">Ping</button>`,
    `  <output>…</output>`,
    `</section>`,
    ``,
  ];
}

/** Code blocks for the non-web languages. Each block is self-contained and blank-line terminated. */
function plainBlock(language: Exclude<LangId, "html" | "css" | "js">, theme: string, n: number): string[] {
  const title = theme.charAt(0).toUpperCase() + theme.slice(1);
  const f = (n % 7) + 1;

  if (language === "python") {
    return [
      `# ${title} block ${n}`,
      `def ${theme}_compute_${n}(values: list) -> float:`,
      `    """Return the weighted score of block ${n} for ${theme}."""`,
      `    total = 0`,
      `    for index, value in enumerate(values):`,
      `        total += value * ${f} + index`,
      `    return round(total / max(len(values), 1), 2)`,
      ``,
      ``,
    ];
  }

  if (language === "typescript") {
    return [
      `// ${title} block ${n}`,
      `export interface ${title}Item${n} {`,
      `  id: number;`,
      `  label: string;`,
      `  score: number;`,
      `}`,
      ``,
      `export function ${theme}Score${n}(items: ${title}Item${n}[]): number {`,
      `  return items.reduce((sum, item) => sum + item.score * ${f}, 0);`,
      `}`,
      ``,
    ];
  }

  if (language === "json") {
    // JSON Lines style: one complete JSON document per block.
    return [
      `{`,
      `  "block": ${n},`,
      `  "theme": "${theme}",`,
      `  "title": "${title} #${n}",`,
      `  "factor": ${f},`,
      `  "tags": ["${theme}", "block-${n}", "generated"]`,
      `}`,
      ``,
    ];
  }

  if (language === "markdown") {
    return [
      `## ${title} #${n}`,
      ``,
      `- Point one of block ${n} about ${theme}`,
      `- Weighted factor: **${f}**`,
      `- Generated by the non-stop writer`,
      ``,
      `> Block ${n} appears once in ${theme}.`,
      ``,
      ``,
    ];
  }

  // sql
  return [
    `-- ${title} block ${n}`,
    `CREATE TABLE IF NOT EXISTS ${theme}_block_${n} (`,
    `  id serial PRIMARY KEY,`,
    `  label text NOT NULL,`,
    `  score integer NOT NULL DEFAULT ${n * f}`,
    `);`,
    ``,
    `INSERT INTO ${theme}_block_${n} (label, score) VALUES ('block-${n}', ${n * f});`,
    ``,
    ``,
  ];
}

function blockFor(language: LangId, theme: string, n: number): string[] {
  if (language === "html" || language === "css" || language === "js") {
    return webBlock(language, theme, n);
  }
  return plainBlock(language, theme, n);
}

/** Lines in one block of the given language. */
export function blockSize(language: LangId): number {
  return blockFor(language, "x", 1).length;
}

/** Number of blocks `snippetLines` emits for the given request (used to advance counters). */
export function blocksFor(language: LangId, count: number): number {
  return Math.ceil(count / blockSize(language));
}

/** Total lines of one matching card across the three web languages. */
export const LINES_PER_CARD =
  blockSize("html") + blockSize("css") + blockSize("js");

/**
 * Returns whole blocks until at least `count` lines are produced (never cuts a block in half,
 * so generated code always stays syntactically valid).
 */
export function snippetLines(
  language: LangId,
  prompt: string,
  count: number,
  startSeq: number,
): string[] {
  const theme = themeFromPrompt(prompt);
  const out: string[] = [];
  let n = startSeq;
  while (out.length < count) {
    out.push(...blockFor(language, theme, n));
    n++;
  }
  return out;
}
