"use client";

import { readJson } from "@/lib/safe-json";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OnMount } from "@monaco-editor/react";
import LangLogo from "./LangLogo";
import {
  ALL_LANGS,
  LANG_META,
  WEB_FILE_NAMES,
  langFromFilename,
  monacoLanguage,
  type LangId,
} from "@/lib/studio/languages";
import { LINES_PER_CARD } from "@/lib/studio/snippets";
import { PRESET_OPTIONS } from "@/lib/studio/website";

const CodeEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-[#858585]">Loading editor…</div>
  ),
});

type EditorInstance = Parameters<OnMount>[0];
type Tone = "info" | "success" | "error";

interface LogEntry {
  id: string;
  time: string;
  text: string;
  tone: Tone;
}

interface ProjectSummary {
  id: number;
  name: string;
  prompt: string;
  updatedAt: string;
}

type Files = Record<string, string>; // file name -> content

const HTML = WEB_FILE_NAMES.html;
const CSS = WEB_FILE_NAMES.css;
const JS = WEB_FILE_NAMES.js;
const WEB_FILES = [HTML, CSS, JS];

const STARTER: Files = {
  [HTML]:
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My page</title>\n' +
    '  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <h1>Hello, Code Studio!</h1>\n' +
    "  <p>Pick a project type and build a website, or start the writer.</p>\n" +
    '  <script src="script.js"></script>\n</body>\n</html>\n',
  [CSS]: "body {\n  font-family: system-ui, sans-serif;\n  margin: 40px;\n}\n",
  [JS]: 'console.log("Hello from script.js");\n',
};

const DEFAULT_PROMPT = "Modern website for my coffee shop called Sunrise Coffee, warm orange colours";

function clamp(value: number, min: number, max: number): number {
  const n = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function linesOf(text: string): string[] {
  const parts = text.split("\n");
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function joinLines(lines: string[]): string {
  return lines.length ? lines.join("\n") + "\n" : "";
}

function countLines(text: string): number {
  return linesOf(text).length;
}

/**
 * Removes about `count` lines beginning at line index `start`, extending to the next blank line
 * so whole code blocks are removed. This keeps the remaining code valid, which is what lets the
 * preview stay wired together while the writer deletes.
 */
function removeLines(text: string, start: number, count: number): string {
  const lines = linesOf(text);
  const from = Math.min(Math.max(0, start), lines.length);
  let to = Math.min(lines.length, from + Math.max(0, count));
  while (to < lines.length && lines[to - 1] !== "") to++;
  lines.splice(from, to - from);
  return joinLines(lines);
}

/** Keeps only the newest `maxLines` lines, snapping the cut to a block boundary. */
function trimTop(text: string, maxLines: number): string {
  const lines = linesOf(text);
  if (lines.length <= maxLines) return text;
  let start = lines.length - maxLines;
  while (start < lines.length && lines[start - 1] !== "") start++;
  return joinLines(lines.slice(start));
}

type Op = { type: "reset"; file: string } | { type: "append"; file: string; line: string };

/** Human typewriter pacing: milliseconds before the next character, from words-per-minute. */
function typingDelayMs(wpm: number, ch: string, prev: string): number {
  const w = Math.min(300, Math.max(5, wpm));
  // 1 word is treated as 5 characters (standard typing metric) -> ms per character
  const base = 60000 / (w * 5);
  let delay = base;
  if (prev === "\n") delay *= 1.5; // pressing Enter takes a beat
  if (prev === " ") delay *= 1.22; // small pause between words — words emerge one at a time
  if (!/[a-zA-Z0-9\s]/.test(ch)) delay *= 1.3; // symbols and punctuation are slower
  delay *= 0.85 + Math.random() * 0.3; // natural human jitter
  return Math.max(8, delay);
}

/**
 * Wires the three web files into one document for the preview: styles.css is inlined where
 * <link href="styles.css"> would be (or into <head>), and script.js is inlined where
 * <script src="script.js"> would be (or at the end of <body>) so it runs after the HTML exists.
 */
function buildPreview(files: Files): string {
  const styleTag = `<style>\n${files[CSS] ?? ""}\n</style>`;
  const scriptTag = `<script>\n${(files[JS] ?? "").replace(/<\/script/gi, "<\\/script")}\n</script>`;
  const linkRe = /<link[^>]*href=["']\.?\/?styles\.css["'][^>]*>/i;
  const scriptRe = /<script[^>]*src=["']\.?\/?script\.js["'][^>]*>\s*<\/script>/i;

  let html = files[HTML] ?? "";
  const isFragment = !/<html[\s>]/i.test(html) && !/<body[\s>]/i.test(html);
  if (isFragment) {
    html =
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
      `<link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n${html}\n` +
      `<script src="script.js"></script>\n</body>\n</html>`;
  }

  if (linkRe.test(html)) html = html.replace(linkRe, () => styleTag);
  else if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, () => `${styleTag}\n</head>`);
  else html = styleTag + html;

  if (scriptRe.test(html)) html = html.replace(scriptRe, () => scriptTag);
  else if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, () => `${scriptTag}\n</body>`);
  else html = html + scriptTag;
  return html;
}

async function readLines(res: Response, onLines: (lines: string[]) => void): Promise<void> {
  if (!res.body) throw new Error("Empty response from generator");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const parts = pending.split("\n");
    pending = parts.pop() ?? "";
    if (parts.length) onLines(parts);
  }
  pending += decoder.decode();
  if (pending) onLines([pending]);
}

/* ---------------------------------- chrome ---------------------------------- */

function IconFiles({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}
function IconRun({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}
function IconOutput({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h10M4 18h14" />
    </svg>
  );
}
function IconHome({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6.5 10.5V20h11V10.5" />
    </svg>
  );
}
function IconFullscreen({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}
function IconCommand({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 8l5 4-5 4" />
      <path d="M12.5 17H19" />
    </svg>
  );
}
function IconPreviewPane({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="8.6" r="1.1" fill="currentColor" stroke="none" opacity="0.6" />
    </svg>
  );
}


function NumField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-[#9d9d9d]">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded bg-[#1e1e1e] px-2 py-1 text-sm text-[#cccccc] ring-1 ring-[#3c3c3c] outline-none focus:ring-[#007acc] disabled:opacity-50"
      />
    </label>
  );
}

/* --------------------------------- component --------------------------------- */

export default function StudioClient() {
  const router = useRouter();
  const [files, setFiles] = useState<Files>(STARTER);
  const filesRef = useRef(files);
  const [active, setActive] = useState<string>(HTML);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("Untitled project");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [projectType, setProjectType] = useState("auto");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [busy, setBusy] = useState<null | "website" | "writer">(null);
  const [phase, setPhase] = useState("Ready");
  const [writerLang, setWriterLang] = useState<LangId | "all">("all");
  const [showPanel, setShowPanel] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [burst, setBurst] = useState(200);
  const [deletePercent, setDeletePercent] = useState(50);
  const [maxLines, setMaxLines] = useState(1200);
  const [wpm, setWpm] = useState(30); // typewriter speed: words per minute (human typing pace)
  const [stats, setStats] = useState({ cycles: 0, written: 0, deleted: 0 });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [openMenu, setOpenMenu] = useState<null | "file" | "view" | "help">(null);
  const [keeperOn, setKeeperOn] = useState(false);


  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef<Record<string, number>>({});
  const editorRef = useRef<EditorInstance | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const paletteInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const savedSnapshotRef = useRef("");

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const pushLog = useCallback((text: string, tone: Tone = "info") => {
    setLog((prev) => [
      ...prev.slice(-199),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, time: new Date().toLocaleTimeString(), text, tone },
    ]);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewDoc(buildPreview(files)), busy ? 600 : 120);
    return () => window.clearTimeout(timer);
  }, [files, busy]);

  useEffect(() => {
    if (busy !== "writer" || !editorRef.current) return;
    const count = editorRef.current.getModel()?.getLineCount();
    if (count) editorRef.current.revealLine(count);
  }, [files, busy]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The screen keeper is active while the AI is running, or manually enabled.
  const keeperActive = keeperOn || busy !== null;

  // Wake Lock API: the real way a web page keeps the display on (tab must be visible).
  useEffect(() => {
    if (!keeperActive) return;
    let cancelled = false;
    let sentinel: { released: boolean; release: () => void } | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = (await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ released: boolean; release: () => void }> } }).wakeLock.request("screen"));
          if (!cancelled) pushLog("Screen wake lock acquired — the display stays on while the tab is visible.", "success");
        } else if (!cancelled) {
          pushLog("Wake Lock API is not available here; the browser may still sleep the screen.", "info");
        }
      } catch {
        if (!cancelled) pushLog("Wake lock was denied; keep the tab visible so the display stays on.", "info");
      }
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && sentinel?.released) void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        sentinel?.release();
      } catch {
        /* already released */
      }
    };
  }, [keeperActive, pushLog]);

  const allFileNames = useMemo(
    () => [...WEB_FILES, ...Object.keys(files).filter((f) => !WEB_FILES.includes(f)).sort()],
    [files],
  );

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = (await readJson(res)) as { projects?: ProjectSummary[] };
      setProjects(json.projects ?? []);
      return json.projects ?? [];
    } catch {
      return [];
    }
  }, []);

  const openProject = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      const json = (await readJson(res)) as {
        project?: { id: number; name: string; prompt: string; html: string; css: string; js: string; extraFiles: Record<string, string> };
        error?: string;
      };
      if (!res.ok || !json.project) {
        pushLog(json.error ?? "Could not open project.", "error");
        return;
      }
      const p = json.project;
      const next: Files = {
        [HTML]: p.html,
        [CSS]: p.css,
        [JS]: p.js,
        ...(p.extraFiles ?? {}),
      };
      setFiles(next);
      setProjectId(p.id);
      setProjectName(p.name);
      setPrompt(p.prompt || DEFAULT_PROMPT);
      setActive(HTML);
      savedSnapshotRef.current = JSON.stringify(next);
      setDirty(false);
      pushLog(`Opened "${p.name}".`, "success");
    },
    [pushLog],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await refreshProjects();
      if (!cancelled && list.length > 0) await openProject(list[0].id);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProjects, openProject]);

  useEffect(() => {
    setDirty(JSON.stringify(filesRef.current) !== savedSnapshotRef.current);
  }, [files]);

  const saveProject = useCallback(async () => {
    const current = filesRef.current;
    const payload = {
      name: projectName.trim() || "Untitled project",
      prompt,
      html: current[HTML] ?? "",
      css: current[CSS] ?? "",
      js: current[JS] ?? "",
      extraFiles: Object.fromEntries(Object.entries(current).filter(([f]) => !WEB_FILES.includes(f))),
    };
    try {
      const res = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await readJson(res)) as { project?: { id: number }; error?: string };
      if (!res.ok || !json.project) {
        pushLog(json.error ?? "Save failed.", "error");
        return;
      }
      setProjectId(json.project.id);
      setSavedAt(new Date().toLocaleTimeString());
      savedSnapshotRef.current = JSON.stringify(current);
      setDirty(false);
      pushLog(`Saved "${payload.name}".`, "success");
      void refreshProjects();
    } catch {
      pushLog("Save failed: network error.", "error");
    }
  }, [projectId, projectName, prompt, pushLog, refreshProjects]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveProject();
        return;
      }
      if (mod && (event.key.toLowerCase() === "p" || (event.shiftKey && event.key.toLowerCase() === "p"))) {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery("");
        setPaletteIndex(0);
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setOpenMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveProject]);

  useEffect(() => {
    if (paletteOpen) paletteInputRef.current?.focus();
  }, [paletteOpen]);

  const newProject = () => {
    if (busy) return;
    setFiles({ ...STARTER });
    setProjectId(null);
    setProjectName("Untitled project");
    setPrompt(DEFAULT_PROMPT);
    setProjectType("auto");
    setActive(HTML);
    setStats({ cycles: 0, written: 0, deleted: 0 });
    seqRef.current = {};
    savedSnapshotRef.current = JSON.stringify({ ...STARTER });
    setDirty(false);
    setSavedAt("");
    pushLog("Started a new project.");
  };

  const deleteProject = async () => {
    if (!projectId || busy) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    pushLog("Project deleted.");
    newProject();
    void refreshProjects();
  };

  const stop = () => abortRef.current?.abort();

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      pushLog("Full screen is not available in this browser.", "error");
    }
  };

  const openPreviewTab = () => {
    const blob = new Blob([buildPreview(filesRef.current)], { type: "text/html" });
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    window.open(url, "_blank", "noopener");
  };

  const addFile = () => {
    const name = newFileName.trim();
    if (!name || !/^[\w][\w.\- ]{0,60}\.[A-Za-z0-9]{1,8}$/.test(name)) return;
    if (filesRef.current[name] !== undefined) {
      setActive(name);
      setNewFileOpen(false);
      setNewFileName("");
      return;
    }
    setFiles((prev) => ({ ...prev, [name]: `// ${name}\n` }));
    setActive(name);
    setNewFileOpen(false);
    setNewFileName("");
    pushLog(`Created ${name} (${LANG_META[langFromFilename(name)].label}).`);
  };

  const removeFile = (name: string) => {
    if (busy || WEB_FILES.includes(name)) return;
    setFiles((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (active === name) setActive(HTML);
    pushLog(`Deleted ${name}.`);
  };

  /* ------------------------- typewriter (human typing) ------------------------- */
  // Code is queued here and revealed one character at a time at the chosen WPM,
  // with the editor caret following the last typed character.
  const typeQueueRef = useRef<Op[]>([]);
  const typingRef = useRef(false);
  const typeWaitersRef = useRef<(() => void)[]>([]);
  const wpmRef = useRef(30);
  const activeRef = useRef(active);

  useEffect(() => {
    wpmRef.current = wpm;
  }, [wpm]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /** Points the editor caret at the end of the freshly typed text (the "pointer"). */
  const moveCaret = useCallback((file: string) => {
    if (activeRef.current !== file) return;
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const line = model.getLineCount();
    editor.setPosition({ lineNumber: line, column: model.getLineMaxColumn(line) });
    editor.revealLine(line);
  }, []);

  const runPump = useCallback(async () => {
    typingRef.current = true;
    // put focus on the editor so the caret pointer blinks at once (inputs are
    // disabled while typing runs, so this can never steal a keystroke)
    editorRef.current?.focus();
    let lastFile: string | null = null;
    try {
      while (typeQueueRef.current.length > 0) {
        if (abortRef.current?.signal.aborted) {
          typeQueueRef.current = [];
          break;
        }
        const op = typeQueueRef.current.shift()!;
        if (op.type === "reset") {
          setFiles((prev) => ({ ...prev, [op.file]: "" }));
          continue;
        }
        if (lastFile !== op.file) {
          lastFile = op.file;
          setActive(op.file);
          await sleep(60); // let the tab switch render before typing starts
          moveCaret(op.file);
        }
        // make sure the new line starts on its own line
        setFiles((prev) => {
          const cur = prev[op.file] ?? "";
          return { ...prev, [op.file]: cur === "" || cur.endsWith("\n") ? cur : cur + "\n" };
        });
        for (let i = 0; i < op.line.length; i++) {
          if (abortRef.current?.signal.aborted) {
            typeQueueRef.current = [];
            break;
          }
          const ch = op.line[i];
          setFiles((prev) => ({ ...prev, [op.file]: (prev[op.file] ?? "") + ch }));
          await sleep(typingDelayMs(wpmRef.current, ch, i === 0 ? "\n" : op.line[i - 1]));
          moveCaret(op.file);
        }
        if (abortRef.current?.signal.aborted) {
          typeQueueRef.current = [];
          break;
        }
        setFiles((prev) => {
          const cur = prev[op.file] ?? "";
          return { ...prev, [op.file]: cur.endsWith("\n") ? cur : cur + "\n" };
        });
        moveCaret(op.file);
        // human pause between lines
        await sleep(typingDelayMs(wpmRef.current, "\n", "\n") * 1.4);
      }
    } finally {
      typingRef.current = false;
      const waiters = typeWaitersRef.current;
      typeWaitersRef.current = [];
      waiters.forEach((w) => w());
      if (typeQueueRef.current.length > 0) void runPump();
    }
  }, [moveCaret]);

  /** Queues ops for typewriter reveal; resolves when everything has been typed. */
  const enqueueTyping = useCallback(
    (ops: Op[]): Promise<void> => {
      if (ops.length === 0) return Promise.resolve();
      typeQueueRef.current.push(...ops);
      const done = new Promise<void>((resolve) => typeWaitersRef.current.push(resolve));
      if (!typingRef.current) void runPump();
      return done;
    },
    [runPump],
  );

  /** Streams one snippet burst into `file`, returning how many lines and blocks were written. */
  const writeBurst = async (
    file: string,
    lang: LangId,
    request: { count?: number; blocks?: number },
    topic: string,
    signal: AbortSignal,
  ): Promise<{ lines: number; blocks: number }> => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "snippet",
        language: lang,
        ...request,
        seq: seqRef.current[lang] ?? 1,
        delayMs: 0, // the client paces typing (WPM); the server answers immediately
        prompt: topic,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Generator returned ${res.status}`);
    const blocks = Number(res.headers.get("X-Blocks")) || 0;
    const ops: Op[] = [];
    await readLines(res, (chunk) => {
      for (const line of chunk) ops.push({ type: "append", file, line });
    });
    seqRef.current[lang] = (seqRef.current[lang] ?? 1) + blocks;
    // type the burst out character by character before the caller continues
    await enqueueTyping(ops);
    return { lines: ops.length, blocks };
  };

  /**
   * Non-stop writer: writes a burst, deletes part of it, then continues until Stop.
   * - "all": each cycle writes the same N cards to index.html, styles.css and script.js,
   *   then removes the same cards from all three, so the preview stays styled and animated.
   * - one language: writes into that language's file (main.py, app.ts, … created on demand).
   */
  const startWriter = async () => {
    if (busy) return;
    const allMode = writerLang === "all";
    const topic = prompt.trim() || "app";
    const size = clamp(burst, 10, 1000);
    const ratio = clamp(deletePercent, 0, 100) / 100;
    const limit = clamp(maxLines, 50, 20000);
    const cardsPerCycle = Math.max(1, Math.round(size / LINES_PER_CARD));

    const targets: { lang: LangId; file: string }[] = allMode
      ? [
          { lang: "html", file: HTML },
          { lang: "css", file: CSS },
          { lang: "js", file: JS },
        ]
      : (() => {
          const lang = writerLang as LangId;
          const file = LANG_META[lang].web ? WEB_FILE_NAMES[lang] : LANG_META[lang].defaultFile;
          if (!filesRef.current[file]) {
            setFiles((prev) => ({ ...prev, [file]: `// ${file}\n` }));
          }
          return [{ lang, file }];
        })();

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("writer");
    setActive(targets[0].file);
    setStats({ cycles: 0, written: 0, deleted: 0 });

    if (allMode) {
      seqRef.current = {};
      const title = topic.charAt(0).toUpperCase() + topic.slice(1);
      setFiles({
        [HTML]:
          '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n' +
          '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
          `  <title>${title}</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n` +
          `  <h1>${title}</h1>\n\n`,
        [CSS]:
          "body {\n  margin: 0;\n  padding: 24px;\n  background: #f4f6fb;\n  font-family: system-ui, sans-serif;\n}\n" +
          "h1 {\n  text-align: center;\n  color: #1f2937;\n}\n\n",
        [JS]: "// Each script below finds its card in index.html, reveals it and fills the score.\n\n",
      });
      await sleep(50);
      pushLog(
        `Non-stop writer started: ${cardsPerCycle} animated cards per cycle across HTML, CSS and JS → delete ${Math.round(ratio * 100)}% → repeat.`,
        "success",
      );
    } else {
      pushLog(
        `Non-stop writer started: ${size} lines → delete ${Math.round(ratio * 100)}% → repeat in ${targets[0].file}.`,
        "success",
      );
    }

    let cycles = 0;
    let written = 0;
    let deleted = 0;

    try {
      while (!controller.signal.aborted) {
        cycles++;

        if (allMode) {
          const startAt: Record<string, number> = {};
          const wrote: Record<string, number> = {};
          for (const t of targets) {
            if (controller.signal.aborted) break;
            setActive(t.file);
            setPhase(`Cycle ${cycles}: writing ${cardsPerCycle} cards of ${LANG_META[t.lang].label}`);
            startAt[t.file] = countLines(filesRef.current[t.file] ?? "");
            const result = await writeBurst(t.file, t.lang, { blocks: cardsPerCycle }, topic, controller.signal);
            wrote[t.file] = result.lines;
            written += result.lines;
          }
          if (controller.signal.aborted) break;

          const removeCards = Math.floor(cardsPerCycle * ratio);
          setPhase(`Cycle ${cycles}: deleting ${removeCards} cards from all three files`);
          await sleep(350, controller.signal);
          if (controller.signal.aborted) break;

          setFiles((prev) => {
            const next: Files = { ...prev };
            for (const t of targets) {
              const perCard = wrote[t.file] / cardsPerCycle;
              const count = Math.round(perCard * removeCards);
              next[t.file] = trimTop(removeLines(next[t.file] ?? "", startAt[t.file], count), limit);
            }
            return next;
          });
          deleted += Math.round(removeCards * LINES_PER_CARD);
          setStats({ cycles, written, deleted });
          pushLog(
            `Cycle ${cycles}: wrote ${cardsPerCycle} cards (${wrote[HTML]} html, ${wrote[CSS]} css, ${wrote[JS]} js lines), deleted ${removeCards} cards.`,
          );
          await sleep(350, controller.signal);
          continue;
        }

        const t = targets[0];
        const startAt = countLines(filesRef.current[t.file] ?? "");
        setPhase(`Cycle ${cycles}: writing ${size} lines of ${LANG_META[t.lang].label}`);
        const result = await writeBurst(t.file, t.lang, { count: size }, topic, controller.signal);
        written += result.lines;

        const removeCount = Math.floor(result.lines * ratio);
        setPhase(`Cycle ${cycles}: deleting ${removeCount} lines`);
        await sleep(350, controller.signal);
        if (controller.signal.aborted) break;

        setFiles((prev) => ({
          ...prev,
          [t.file]: trimTop(removeLines(prev[t.file] ?? "", startAt, removeCount), limit),
        }));
        deleted += removeCount;
        setStats({ cycles, written, deleted });
        pushLog(`Cycle ${cycles} (${t.file}): wrote ${result.lines} lines, deleted ${removeCount}.`);
        await sleep(350, controller.signal);
      }
      pushLog("Non-stop writer stopped.");
    } catch (err) {
      if (controller.signal.aborted) pushLog("Non-stop writer stopped.");
      else pushLog(`Writer error: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    } finally {
      abortRef.current = null;
      setBusy(null);
      setPhase("Ready");
    }
  };

  /** Website builder: streams index.html, styles.css and script.js for the chosen project type. */
  const buildWebsite = async () => {
    const text = prompt.trim();
    if (busy) return;
    if (!text) {
      pushLog("Describe the website you want first.", "error");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("website");
    const typeLabel = projectType === "auto" ? "auto-detected" : projectType;
    setPhase(`Building ${typeLabel} website…`);
    pushLog(`Building website (type: ${typeLabel}) from prompt: "${text.slice(0, 80)}"`);

    const markerMap: Record<string, string> = { "index.html": HTML, "styles.css": CSS, "script.js": JS };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "website",
          prompt: text,
          type: projectType === "auto" ? undefined : projectType,
          delayMs: 0, // the client paces typing (WPM)
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Generator returned ${res.status}`);

      let current: string | null = null;
      const ops: Op[] = [];
      await readLines(res, (lines) => {
        for (const line of lines) {
          if (line.startsWith("@@FILE:")) {
            current = markerMap[line.slice(7).trim()] ?? null;
            if (current) ops.push({ type: "reset", file: current });
          } else if (current) {
            ops.push({ type: "append", file: current, line });
          }
        }
      });
      // type all three files out like a human, one character at a time
      await enqueueTyping(ops);

      setActive(HTML);
      seqRef.current = {};
      pushLog("Website ready: index.html, styles.css and script.js. Press Ctrl+S to save.", "success");
    } catch (err) {
      if (controller.signal.aborted) pushLog("Website generation stopped.");
      else pushLog(`Error: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    } finally {
      abortRef.current = null;
      setBusy(null);
      setPhase("Ready");
    }
  };

  /* ------------------------------ command palette ------------------------------ */

  const commands = useMemo(
    () =>
      [
        { label: "New project", hint: "File", run: () => newProject() },
        { label: "Save project", hint: "Ctrl+S", run: () => void saveProject() },
        { label: "Delete current project", hint: "File", run: () => void deleteProject() },
        { label: "Build website from prompt", hint: "AI", run: () => void buildWebsite() },
        { label: busy === "writer" ? "Stop non-stop writer" : "Start non-stop writer", hint: "AI", run: () => (busy === "writer" ? stop() : void startWriter()) },
        { label: "Open preview in new browser tab", hint: "Preview", run: () => openPreviewTab() },
        { label: showPreview ? "Hide live preview" : "Show live preview", hint: "View", run: () => setShowPreview((v) => !v) },
        { label: showPanel ? "Hide AI assistant panel" : "Show AI assistant panel", hint: "View", run: () => setShowPanel((v) => !v) },
        { label: showExplorer ? "Hide explorer" : "Show explorer", hint: "View", run: () => setShowExplorer((v) => !v) },
        { label: showOutput ? "Hide output panel" : "Show output panel", hint: "View", run: () => setShowOutput((v) => !v) },
        { label: isFullscreen ? "Exit full screen" : "Full screen", hint: "View", run: () => void toggleFullscreen() },
        { label: "Create new file…", hint: "Explorer", run: () => { setShowExplorer(true); setNewFileOpen(true); } },
        { label: keeperOn ? "Stop keep-awake" : "Keep screen awake", hint: "screen", run: () => setKeeperOn((v) => !v) },
        { label: "Go to home page", hint: "", run: () => router.push("/") },
        { label: "Go to spreadsheet", hint: "", run: () => router.push("/sheet") },
      ] as { label: string; hint: string; run: () => void }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, showPreview, showPanel, showExplorer, showOutput, isFullscreen, projectId, keeperOn],
  );

  // eslint-disable-next-line react-hooks/refs -- `commands` only reads refs inside click handlers, never during render
  const filtered = commands.filter((c) => c.label.toLowerCase().includes(paletteQuery.toLowerCase()));
  const runCommand = (c: { label: string; hint: string; run: () => void }) => {
    setPaletteOpen(false);
    setPaletteQuery("");
    c.run();
  };

  /* ---------------------------------- render ---------------------------------- */

  const currentText = files[active] ?? "";
  const activeLang = langFromFilename(active);
  const totalLines = countLines(currentText);

  const menuBtn = "rounded px-2 py-1 text-[#cccccc] hover:bg-[#505050]";
  const iconBtn = "rounded px-1.5 py-0.5 text-sm text-[#bbbbbb] hover:bg-[#3c3c3c] hover:text-white";

  const menus: Record<string, { label: string; hint?: string; run: () => void }[]> = {
    file: [
      { label: "New Project", run: () => newProject() },
      { label: "Save Project", hint: "Ctrl+S", run: () => void saveProject() },
      { label: "Delete Current Project", run: () => void deleteProject() },
      { label: "Open Spreadsheet", run: () => router.push("/sheet") },
    ],
    view: [
      { label: showExplorer ? "Hide Explorer" : "Show Explorer", run: () => setShowExplorer((v) => !v) },
      { label: showPreview ? "Hide Preview" : "Show Preview", run: () => setShowPreview((v) => !v) },
      { label: showPanel ? "Hide AI Panel" : "Show AI Panel", run: () => setShowPanel((v) => !v) },
      { label: showOutput ? "Hide Output" : "Show Output", run: () => setShowOutput((v) => !v) },
      { label: "Command Palette", hint: "Ctrl+Shift+P", run: () => setPaletteOpen(true) },
      { label: isFullscreen ? "Exit Full Screen" : "Full Screen", run: () => void toggleFullscreen() },
    ],
    help: [
      { label: "Home page", run: () => router.push("/") },
      { label: "Health check", run: () => window.open("/api/health", "_blank") },
      { label: "Deployment guide", run: () => window.open("https://github.com", "_blank") },
    ],
  };

  const activityItem = (
    label: string,
    icon: ReactNode,
    on: boolean,
    onClick: () => void,
    extra?: ReactNode,
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={`relative flex h-12 w-12 items-center justify-center ${
        on ? "border-l-2 border-white text-white" : "text-[#858585] hover:text-white"
      }`}
    >
      {icon}
      {extra}
    </button>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      {/* Menu / title bar */}
      <header className="relative flex h-8 shrink-0 items-center gap-0.5 bg-[#3c3c3c] px-1 text-xs">
        <span className="mx-1 text-sm font-bold text-[#4fc1ff]">◆</span>
        {/* eslint-disable-next-line react-hooks/refs -- menu item run() callbacks read refs only when clicked */}
        {(["file", "view", "help"] as const).map((m) => (
          <div key={m} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === m ? null : m)}
              className={`${menuBtn} capitalize ${openMenu === m ? "bg-[#505050]" : ""}`}
            >
              {m}
            </button>
            {openMenu === m && (
              <div className="absolute left-0 top-full z-50 w-56 rounded-b bg-[#252526] py-1 shadow-2xl ring-1 ring-black/50">
                {menus[m].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      item.run();
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-[#04395e] hover:text-white"
                  >
                    <span>{item.label}</span>
                    {item.hint && <span className="text-[10px] text-[#858585]">{item.hint}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={!!busy}
          aria-label="Project name"
          className="absolute left-1/2 w-[min(36%,380px)] -translate-x-1/2 rounded bg-transparent px-2 py-0.5 text-center text-xs text-[#cccccc] outline-none hover:bg-[#505050] focus:bg-[#1e1e1e] focus:ring-1 focus:ring-[#007acc] disabled:opacity-60"
        />

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[11px] text-[#b5b5b5]">{savedAt ? `Saved ${savedAt}` : dirty ? "● unsaved" : "Ctrl+S saves"}</span>
          <button type="button" onClick={openPreviewTab} className={menuBtn} title="Open the wired preview in a browser tab">
            Open in browser ↗
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={`${menuBtn} font-semibold text-white`}
            title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>
          <span className="ml-1 select-none pr-1 text-[#858585]">— ▢ ✕</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav className="flex w-12 shrink-0 flex-col items-center bg-[#333333]">
          {activityItem("Explorer", <IconFiles />, showExplorer, () => setShowExplorer((v) => !v))}
          {activityItem("Search / command palette", <IconCommand />, paletteOpen, () => setPaletteOpen(true))}
          {activityItem(
            busy === "writer" ? "Stop writer" : "Run writer",
            <IconRun />,
            busy === "writer",
            // eslint-disable-next-line react-hooks/refs -- stop()/startWriter() run on click, not during render
            () => (busy === "writer" ? stop() : void startWriter()),
            busy === "writer" ? <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[#89d185]" /> : null,
          )}
          {activityItem("AI assistant", <span className="text-xl">✦</span>, showPanel, () => setShowPanel((v) => !v),
            busy && busy !== "writer" ? <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[#89d185]" /> : null,
          )}
          {activityItem("Live preview", <IconPreviewPane />, showPreview, () => setShowPreview((v) => !v))}
          {activityItem("Output", <IconOutput />, showOutput, () => setShowOutput((v) => !v))}
          <div className="mt-auto">
            {activityItem("Home", <IconHome />, false, () => router.push("/"))}
            {activityItem(isFullscreen ? "Exit full screen" : "Full screen", <IconFullscreen />, isFullscreen, () => void toggleFullscreen())}
          </div>
        </nav>

        {/* Explorer */}
        {showExplorer && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526]">
            <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb]">
              <span>EXPLORER</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setNewFileOpen((v) => !v)} className={iconBtn} title="New file…">
                  +
                </button>
                <button type="button" onClick={() => setShowExplorer(false)} className={iconBtn} title="Hide explorer">
                  ◀
                </button>
              </div>
            </div>
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#cccccc]">
              ▾ {projectName}
            </div>
            {newFileOpen && (
              <div className="flex items-center gap-1 px-3 pb-1">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addFile();
                    if (e.key === "Escape") { setNewFileOpen(false); setNewFileName(""); }
                  }}
                  placeholder="name.ext (e.g. main.py)"
                  className="min-w-0 flex-1 rounded bg-[#1e1e1e] px-2 py-1 text-xs text-[#cccccc] ring-1 ring-[#007acc] outline-none"
                />
                <button type="button" onClick={addFile} className={iconBtn}>✓</button>
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-auto px-1 pb-2">
              {allFileNames.map((name) => {
                const lang = langFromFilename(name);
                const isWeb = WEB_FILES.includes(name);
                return (
                  <li key={name} className="group">
                    <button
                      type="button"
                      onClick={() => setActive(name)}
                      className={`flex w-full items-center gap-2 rounded px-3 py-1 pl-5 text-left text-[13px] ${
                        active === name ? "bg-[#37373d] text-white" : "hover:bg-[#2a2d2e]"
                      }`}
                    >
                      <LangLogo lang={lang} size={15} />
                      <span className="truncate">{name}</span>
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-[#858585]">
                        {dirty && active === name && <span className="text-white">●</span>}
                        <span>{countLines(files[name] ?? "")}</span>
                        {!isWeb && !busy && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); removeFile(name); }}
                            onKeyDown={(e) => { if (e.key === "Enter") removeFile(name); }}
                            className="hidden rounded px-0.5 hover:bg-[#3c3c3c] hover:text-[#f48771] group-hover:inline"
                            title={`Delete ${name}`}
                          >
                            ✕
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-1 border-t border-[#2b2b2b] px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb]">
              ▾ SAVED PROJECTS
            </div>
            <ul className="max-h-40 space-y-0.5 overflow-auto px-1 pb-2">
              {projects.length === 0 && <li className="px-3 py-1 text-xs text-[#858585]">No saved projects yet.</li>}
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void openProject(p.id)}
                    disabled={!!busy}
                    className={`w-full rounded px-3 py-1 text-left text-[13px] disabled:opacity-60 ${
                      projectId === p.id ? "bg-[#37373d] text-white" : "hover:bg-[#2a2d2e]"
                    }`}
                  >
                    <div className="truncate">{p.name}</div>
                    <div className="text-[10px] text-[#858585]">{new Date(p.updatedAt).toLocaleString()}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* AI assistant side panel (left of the workspace) */}
        <aside className={`flex w-[320px] shrink-0 flex-col border-r border-[#3c3c3c] bg-[#252526] ${showPanel ? "" : "hidden"}`}>
          <div className="flex items-center gap-2 px-3 pb-1 pt-2">
            <span className="text-sm text-[#c586c0]">✦</span>
            <div className="text-[11px] font-semibold tracking-wider text-[#bbbbbb]">AI ASSISTANT</div>
            <button type="button" onClick={() => setShowPanel(false)} className={`${iconBtn} ml-auto`} title="Hide AI assistant (left panel)">◀</button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-2 px-3 pb-3">
              <p className="text-xs text-[#858585]">
                Choose what to build, describe it, then let the AI write the code.
              </p>

              <label className="flex flex-col gap-1 text-[11px] text-[#9d9d9d]">
                Project type
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  disabled={!!busy}
                  className="rounded bg-[#1e1e1e] px-2 py-1.5 text-sm text-[#cccccc] ring-1 ring-[#3c3c3c] outline-none disabled:opacity-50"
                >
                  <option value="auto">Auto — detect from the prompt</option>
                  {PRESET_OPTIONS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label} website
                    </option>
                  ))}
                </select>
              </label>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!!busy}
                rows={4}
                placeholder="e.g. A dark portfolio website for a photographer called Lens & Light"
                className="w-full resize-none rounded bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] ring-1 ring-[#3c3c3c] outline-none focus:ring-[#007acc] disabled:opacity-60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void buildWebsite()}
                  disabled={!!busy}
                  className="flex-1 rounded bg-[#0e639c] px-3 py-2 text-sm font-medium text-white hover:bg-[#1177bb] disabled:opacity-50"
                >
                  ✨ Build attractive website
                </button>
                {busy === "website" && (
                  <button type="button" onClick={stop} className="rounded bg-[#a1260d] px-3 py-2 text-sm text-white">Stop</button>
                )}
              </div>
            </div>

            <div className="border-t border-[#3c3c3c] px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#bbbbbb]">KEEP SCREEN AWAKE</span>
                <button
                  type="button"
                  onClick={() => {
                    setKeeperOn((v) => !v);
                    pushLog(
                      keeperOn
                        ? "Keep-awake stopped."
                        : "Keep-awake started — the screen stays on while this tab is visible.",
                      "success",
                    );
                  }}
                  className={`rounded px-2.5 py-1 text-xs font-medium text-white ${
                    keeperActive ? "bg-[#a1260d] hover:bg-[#c42b1c]" : "bg-[#16825d] hover:bg-[#1a9b6f]"
                  }`}
                >
                  {keeperActive ? "■ Active" : "▶ Start"}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-[#858585]">
                While the AI runs (or when started here), the browser holds a wake lock so the screen
                stays awake — no moving cursor, no fake mouse. Works while this tab is visible.
              </p>
            </div>

            <div className="border-t border-[#3c3c3c] px-3 pt-3">
              <div className="mb-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb]">NON-STOP WRITER</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 flex flex-col gap-1 text-[11px] text-[#9d9d9d]">
                  <span className="flex items-center gap-2">
                    Language
                    {writerLang !== "all" && <LangLogo lang={writerLang} size={14} />}
                    {writerLang === "all" && (
                      <span className="flex items-center gap-1">
                        <LangLogo lang="html" size={13} />
                        <LangLogo lang="css" size={13} />
                        <LangLogo lang="js" size={13} />
                      </span>
                    )}
                  </span>
                  <select
                    value={writerLang}
                    onChange={(e) => setWriterLang(e.target.value as LangId | "all")}
                    disabled={!!busy}
                    className="rounded bg-[#1e1e1e] px-2 py-1 text-sm text-[#cccccc] ring-1 ring-[#3c3c3c] outline-none disabled:opacity-50"
                  >
                    <option value="all">All three, wired together (HTML + CSS + JS)</option>
                    {ALL_LANGS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label} ({l.defaultFile})
                      </option>
                    ))}
                  </select>
                </label>
                <NumField label="Lines per burst" value={burst} onChange={setBurst} min={10} max={1000} disabled={!!busy} />
                <NumField label="Delete %" value={deletePercent} onChange={setDeletePercent} min={0} max={100} disabled={!!busy} />
                <NumField label="Max file lines" value={maxLines} onChange={setMaxLines} min={50} max={20000} disabled={!!busy} />
                <NumField label="Typewriter (words/min)" value={wpm} onChange={setWpm} min={5} max={300} disabled={!!busy} />
              </div>

              <div className="mt-3">
                {busy === "writer" ? (
                  <button type="button" onClick={stop} className="w-full rounded bg-[#a1260d] px-3 py-2 text-sm font-medium text-white hover:bg-[#c42b1c]">
                    ■ Stop writer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startWriter()}
                    disabled={!!busy}
                    className="w-full rounded bg-[#16825d] px-3 py-2 text-sm font-medium text-white hover:bg-[#1a9b6f] disabled:opacity-50"
                  >
                    ▶ Start non-stop writing
                  </button>
                )}
              </div>

              <div className="my-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded bg-[#1e1e1e] py-2">
                  <div className="text-base font-semibold text-white">{stats.cycles}</div>cycles
                </div>
                <div className="rounded bg-[#1e1e1e] py-2">
                  <div className="text-base font-semibold text-[#89d185]">{stats.written}</div>written
                </div>
                <div className="rounded bg-[#1e1e1e] py-2">
                  <div className="text-base font-semibold text-[#f48771]">{stats.deleted}</div>deleted
                </div>
              </div>
              <p className="pb-3 text-[11px] leading-relaxed text-[#858585]">
                Code is typed character by character at your words-per-minute setting, with the caret
                following the last character — like a human at the keyboard. In “All three” mode every
                card written in HTML gets a matching animated CSS rule and matching script, so the preview
                stays styled and moving the whole time.
              </p>
            </div>
          </div>
        </aside>

        {/* Live preview side panel (toggle from the left activity bar) */}
        {showPreview && (
          <div className="flex w-[400px] shrink-0 flex-col border-r border-[#3c3c3c] bg-[#252526]">
            <div className="flex h-9 shrink-0 items-center gap-2 bg-[#252526] px-2 text-[11px] font-semibold tracking-wider text-[#bbbbbb]">
              <span>LIVE PREVIEW</span>
              <span className="text-[#858585] font-normal">{busy ? "updating…" : "wired"}</span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={openPreviewTab} className={iconBtn} title="Open in a new browser tab">↗</button>
                <button type="button" onClick={() => setShowPreview(false)} className={iconBtn} title="Hide preview">✕</button>
              </div>
            </div>
            <iframe
              title="Live preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts allow-forms allow-modals"
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        )}

        {/* Editor group */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Breadcrumbs */}
          <div className="flex h-6 shrink-0 items-center gap-1 border-b border-[#2b2b2b] bg-[#1e1e1e] px-3 text-[11px] text-[#858585]">
            <span className="truncate">{projectName}</span>
            <span>›</span>
            <LangLogo lang={activeLang} size={12} />
            <span className="text-[#cccccc]">{active}</span>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Tabs */}
                <div className="flex h-9 shrink-0 items-end overflow-x-auto bg-[#252526]">
                  {allFileNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActive(name)}
                      className={`group flex h-9 shrink-0 items-center gap-2 border-r border-[#2b2b2b] px-3 text-[13px] ${
                        active === name
                          ? "border-t border-t-[#007acc] bg-[#1e1e1e] text-white"
                          : "bg-[#2d2d2d] text-[#969696] hover:text-white"
                      }`}
                    >
                      <LangLogo lang={langFromFilename(name)} size={14} />
                      <span className="max-w-40 truncate">{name}</span>
                      {WEB_FILES.includes(name) ? (
                        dirty && active === name ? <span className="text-white">●</span> : null
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); removeFile(name); }}
                          onKeyDown={(e) => { if (e.key === "Enter") removeFile(name); }}
                          className="rounded px-0.5 text-[#969696] hover:bg-[#3c3c3c] hover:text-white"
                          title={`Close ${name}`}
                        >
                          {dirty && active === name ? "●" : "✕"}
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="ml-auto flex h-9 items-center gap-2 px-3 text-[11px] text-[#858585]">
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    height="100%"
                    path={active}
                    language={monacoLanguage(active)}
                    theme="vs-dark"
                    value={currentText}
                    onChange={(value) => {
                      if (busy) return;
                      setFiles((prev) => ({ ...prev, [active]: value ?? "" }));
                    }}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                    options={{
                      minimap: { enabled: true },
                      fontSize: 13,
                      wordWrap: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      smoothScrolling: true,
                      tabSize: 2,
                      readOnly: busy !== null,
                      cursorBlinking: "blink",
                    }}
                  />
                </div>
            </div>

          </div>

          {/* Output panel */}
          {showOutput && (
            <div className="flex h-40 shrink-0 flex-col border-t border-[#3c3c3c] bg-[#1e1e1e]">
              <div className="flex h-8 shrink-0 items-center gap-4 px-3 text-[11px] font-semibold tracking-wider text-[#bbbbbb]">
                <span className="border-b border-[#e7e7e7] pb-1 text-white">OUTPUT</span>
                <span className="font-normal normal-case tracking-normal text-[#858585]">{phase}</span>
                <div className="ml-auto flex items-center gap-2 font-normal normal-case tracking-normal">
                  <span>cycles {stats.cycles}</span>
                  <span className="text-[#89d185]">+{stats.written}</span>
                  <span className="text-[#f48771]">−{stats.deleted}</span>
                  <button type="button" onClick={() => setLog([])} className={iconBtn} title="Clear output">⌫</button>
                  <button type="button" onClick={() => setShowOutput(false)} className={iconBtn} title="Hide output">✕</button>
                </div>
              </div>
              <div ref={logRef} className="min-h-0 flex-1 space-y-0.5 overflow-auto px-3 pb-2 font-mono text-[11px]">
                {log.length === 0 && <div className="text-[#858585]">Nothing yet. Build a website or start the writer.</div>}
                {log.map((entry) => (
                  <div
                    key={entry.id}
                    className={entry.tone === "success" ? "text-[#89d185]" : entry.tone === "error" ? "text-[#f48771]" : "text-[#cccccc]"}
                  >
                    <span className="text-[#858585]">[{entry.time}]</span> {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

      </div>

      {/* Status bar */}
      <footer className="flex h-6 shrink-0 items-center gap-3 bg-[#007acc] px-2 text-xs text-white">
        <span className="flex items-center gap-1" title="main"><span className="text-[10px]">⑂</span> main</span>
        <span title="Sync">⟳</span>
        <span title="No problems">⊗ 0 ⚠ 0</span>
        <span className="font-medium">{busy ? `● ${phase}` : "✓ Ready"}</span>
        <div className="ml-auto flex items-center gap-3">
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span className="flex items-center gap-1">
            <LangLogo lang={activeLang} size={13} /> {LANG_META[activeLang].label}
          </span>
          <span>{active}</span>
          <span title="Full screen">⛶</span>
          {keeperActive && <span title="Screen will stay awake while the tab is visible">☀ awake</span>}
          <span title="Notifications">🔔</span>
        </div>
      </footer>

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="mx-auto mt-24 w-[min(92%,560px)] overflow-hidden rounded-lg bg-[#252526] shadow-2xl ring-1 ring-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#3c3c3c] px-3">
              <span className="text-[#858585]">›</span>
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex((i) => Math.min(i + 1, filtered.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && filtered[paletteIndex]) runCommand(filtered[paletteIndex]);
                }}
                placeholder="Type a command…"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-[#858585]"
              />
            </div>
            <ul className="max-h-72 overflow-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-xs text-[#858585]">No matching commands.</li>}
              {filtered.map((c, i) => (
                <li key={c.label}>
                  <button
                    type="button"
                    onMouseEnter={() => setPaletteIndex(i)}
                    onClick={() => runCommand(c)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] ${
                      i === paletteIndex ? "bg-[#04395e] text-white" : "text-[#cccccc]"
                    }`}
                  >
                    <span>› {c.label}</span>
                    {c.hint && <span className="text-[10px] text-[#858585]">{c.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
