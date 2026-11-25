/** Languages the writer can produce code in, each with its own logo and default file. */
export type LangId =
  | "html"
  | "css"
  | "js"
  | "python"
  | "typescript"
  | "json"
  | "markdown"
  | "sql";

export interface LangMeta {
  id: LangId;
  label: string;
  ext: string;
  defaultFile: string;
  monaco: string;
  /** True for the three files that are wired into the live preview. */
  web: boolean;
}

export const LANG_META: Record<LangId, LangMeta> = {
  html: { id: "html", label: "HTML", ext: "html", defaultFile: "index.html", monaco: "html", web: true },
  css: { id: "css", label: "CSS", ext: "css", defaultFile: "styles.css", monaco: "css", web: true },
  js: { id: "js", label: "JavaScript", ext: "js", defaultFile: "script.js", monaco: "javascript", web: true },
  python: { id: "python", label: "Python", ext: "py", defaultFile: "main.py", monaco: "python", web: false },
  typescript: { id: "typescript", label: "TypeScript", ext: "ts", defaultFile: "app.ts", monaco: "typescript", web: false },
  json: { id: "json", label: "JSON", ext: "json", defaultFile: "data.json", monaco: "json", web: false },
  markdown: { id: "markdown", label: "Markdown", ext: "md", defaultFile: "README.md", monaco: "markdown", web: false },
  sql: { id: "sql", label: "SQL", ext: "sql", defaultFile: "query.sql", monaco: "sql", web: false },
};

export const ALL_LANGS: LangMeta[] = Object.values(LANG_META);
export const WEB_LANGS: LangMeta[] = ALL_LANGS.filter((l) => l.web);

const EXT_TO_LANG: Record<string, LangId> = Object.fromEntries(
  ALL_LANGS.map((l) => [l.ext, l.id]),
) as Record<string, LangId>;
EXT_TO_LANG.jsx = "html";
EXT_TO_LANG.mjs = "js";
EXT_TO_LANG.cjs = "js";
EXT_TO_LANG.htm = "html";
EXT_TO_LANG.scss = "css";
EXT_TO_LANG["yml"] = "json";
EXT_TO_LANG["yaml"] = "json";

/** Guesses the language of a file name from its extension. */
export function langFromFilename(name: string): LangId {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "markdown";
}

export function monacoLanguage(name: string): string {
  return LANG_META[langFromFilename(name)].monaco;
}

export const WEB_FILE_NAMES: Record<string, string> = {
  html: "index.html",
  css: "styles.css",
  js: "script.js",
};
