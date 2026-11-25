import { getPool, ensureSchema } from "@/db";
import { NextResponse } from "next/server";
const PUBLIC_TABLES: Record<string, string> = { announcements: "admin_announcements", downloads: "admin_downloads", videos: "admin_videos" };
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ resource: string }> };
export async function GET(_request: Request, context: Context) {
  const { resource } = await context.params; const table = PUBLIC_TABLES[resource];
  if (!table) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await ensureSchema();
  const result = await getPool().query(`SELECT * FROM "${table}" WHERE "status"='published' ORDER BY "created_at" DESC LIMIT 100`);
  return NextResponse.json({ items: result.rows });
}
export async function POST(request: Request, context: Context) {
  const { resource } = await context.params;
  if (resource !== "messages") return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 12000) : "";
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) return NextResponse.json({ error: "Name, valid email and message are required." }, { status: 400 });
  await ensureSchema();
  const result = await getPool().query('INSERT INTO "admin_messages" ("title", "body", "status") VALUES ($1,$2,\'unread\') RETURNING "id"', [`${name} · ${email}`, message]);
  return NextResponse.json({ ok: true, id: result.rows[0].id }, { status: 201 });
}
