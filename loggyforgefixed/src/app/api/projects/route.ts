import { db, ensureSchema } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireActiveMember } from "@/lib/member/auth";

export const dynamic = "force-dynamic";

const MAX_CODE = 200_000;

function text(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

/** Keeps a small, safe map of extra files ({ filename: content }). */
function files(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  let count = 0;
  for (const [name, content] of Object.entries(value as Record<string, unknown>)) {
    if (typeof content !== "string" || !/^[\w][\w.\- ]{0,60}\.[A-Za-z0-9]{1,8}$/.test(name)) continue;
    out[name] = content.slice(0, MAX_CODE);
    if (++count >= 50) break;
  }
  return out;
}

/** Lists saved projects, most recently updated first (without the code bodies). */
export async function GET() {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      prompt: projects.prompt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.ownerId, Number(auth.member.id)))
    .orderBy(desc(projects.updatedAt))
    .limit(100);
  return Response.json({ projects: rows });
}

/** Creates a project from { name, prompt, html, css, js }. */
export async function POST(request: Request) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const [row] = await db
    .insert(projects)
    .values({
      name: text(body.name, 120).trim() || "Untitled project",
      prompt: text(body.prompt, 4000),
      html: text(body.html, MAX_CODE),
      css: text(body.css, MAX_CODE),
      js: text(body.js, MAX_CODE),
      extraFiles: files(body.extraFiles),
      ownerId: Number(auth.member.id),
    })
    .returning();

  return Response.json({ project: row }, { status: 201 });
}
