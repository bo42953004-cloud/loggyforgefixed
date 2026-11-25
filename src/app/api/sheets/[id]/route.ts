import { db, ensureSchema } from "@/db";
import { sheets } from "@/db/schema";
import { sanitizeCells } from "@/lib/sheet/sanitize";
import { and, eq } from "drizzle-orm";
import { requireActiveMember } from "@/lib/member/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function readId(context: Context): Promise<number | null> {
  const { id } = await context.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  const id = await readId(context);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });

  const [row] = await db.select().from(sheets).where(and(eq(sheets.id, id), eq(sheets.ownerId, Number(auth.member.id)))).limit(1);
  if (!row) return Response.json({ error: "Sheet not found." }, { status: 404 });
  return Response.json({ sheet: row });
}

/** Saves the cell map and metadata of an existing spreadsheet. */
export async function PUT(request: Request, context: Context) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  const id = await readId(context);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const patch: Partial<typeof sheets.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120) || "Untitled sheet";
  if (body.data !== undefined) patch.data = sanitizeCells(body.data);
  if (typeof body.rowCount === "number" && Number.isFinite(body.rowCount)) {
    patch.rowCount = Math.min(100000, Math.max(10, Math.round(body.rowCount)));
  }

  const [row] = await db.update(sheets).set(patch).where(and(eq(sheets.id, id), eq(sheets.ownerId, Number(auth.member.id)))).returning();
  if (!row) return Response.json({ error: "Sheet not found." }, { status: 404 });
  return Response.json({ sheet: row });
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  const id = await readId(context);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });

  await db.delete(sheets).where(and(eq(sheets.id, id), eq(sheets.ownerId, Number(auth.member.id))));
  return Response.json({ ok: true });
}
