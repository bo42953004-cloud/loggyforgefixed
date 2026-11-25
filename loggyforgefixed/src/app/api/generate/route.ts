import { blockSize, blocksFor, snippetLines } from "@/lib/studio/snippets";
import type { LangId } from "@/lib/studio/languages";
import { buildWebsite } from "@/lib/studio/website";
import { requireActiveMember } from "@/lib/member/auth";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const LANG_IDS: LangId[] = ["html", "css", "js", "python", "typescript", "json", "markdown", "sql"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Streams generated code line by line as plain text.
 * - kind "website": emits "@@FILE:<name>" markers followed by index.html, styles.css and script.js.
 *   body.type optionally picks the project type (see PRESET_OPTIONS in lib/studio/website).
 * - kind "snippet": emits `count` lines (or `blocks` whole blocks) of code in `language`
 *   (html | css | js | python | typescript | json | markdown | sql).
 */
export async function POST(request: Request) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const kind = body.kind === "website" ? "website" : "snippet";
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 2000) : "";
  const typeKey = typeof body.type === "string" ? body.type.slice(0, 40) : undefined;
  const delayMs = clamp(body.delayMs, 0, 500, 12);
  const signal = request.signal;

  const rawLang = typeof body.language === "string" ? body.language : "html";
  const snippetLanguage: LangId = (LANG_IDS as string[]).includes(rawLang) ? (rawLang as LangId) : "html";
  // Either a line count ("about 200 lines") or an exact number of blocks (used when the client
  // wants the same cards in HTML, CSS and JS so the three files stay wired together).
  const requestedBlocks = Number(body.blocks);
  const snippetCount =
    Number.isFinite(requestedBlocks) && requestedBlocks > 0
      ? clamp(requestedBlocks, 1, 200, 1) * blockSize(snippetLanguage)
      : clamp(body.count, 1, 2000, 200);
  const snippetBlocks = kind === "snippet" ? blocksFor(snippetLanguage, snippetCount) : 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = async (line: string) => {
        if (signal.aborted) throw new Error("aborted");
        controller.enqueue(encoder.encode(line + "\n"));
        if (delayMs > 0) await sleep(delayMs);
      };

      try {
        if (kind === "website") {
          const files = buildWebsite(prompt, typeKey);
          const parts: [string, string][] = [
            ["index.html", files.html],
            ["styles.css", files.css],
            ["script.js", files.js],
          ];
          for (const [name, content] of parts) {
            controller.enqueue(encoder.encode(`@@FILE:${name}\n`));
            for (const line of content.split("\n")) {
              await send(line);
            }
          }
        } else {
          const startSeq = clamp(body.seq, 1, 1_000_000, 1);
          for (const line of snippetLines(snippetLanguage, prompt, snippetCount, startSeq)) {
            await send(line);
          }
        }
        controller.close();
      } catch {
        // Client stopped the stream (or it failed); close quietly.
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Blocks": String(snippetBlocks),
    },
  });
}
