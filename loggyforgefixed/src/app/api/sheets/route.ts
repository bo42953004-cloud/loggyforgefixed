import { db, ensureSchema } from "@/db";
import { sheets } from "@/db/schema";
import { sanitizeCells } from "@/lib/sheet/sanitize";
import { DEFAULT_ROWS } from "@/lib/sheet/utils";
import { desc, eq } from "drizzle-orm";
import { requireActiveMember } from "@/lib/member/auth";

export const dynamic = "force-dynamic";

/** Lists saved spreadsheets, most recently updated first (without cell data). */
export async function GET() {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  const rows = await db
    .select({
      id: sheets.id,
      name: sheets.name,
      rowCount: sheets.rowCount,
      updatedAt: sheets.updatedAt,
    })
    .from(sheets)
    .where(eq(sheets.ownerId, Number(auth.member.id)))
    .orderBy(desc(sheets.updatedAt))
    .limit(100);
  return Response.json({ sheets: rows });
}

/** Creates a spreadsheet from { name, data, rowCount }. */
export async function POST(request: Request) {
  const auth = await requireActiveMember(); if (auth.response) return auth.response;
  await ensureSchema();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const rowCount =
    typeof body.rowCount === "number" && Number.isFinite(body.rowCount)
      ? Math.min(100000, Math.max(DEFAULT_ROWS, Math.round(body.rowCount)))
      : DEFAULT_ROWS;

  const [row] = await db
    .insert(sheets)
    .values({
      name: name || "Untitled sheet",
      data: sanitizeCells(body.data),
      rowCount,
      ownerId: Number(auth.member.id),
    })
    .returning();

  return Response.json({ sheet: row }, { status: 201 });
}
