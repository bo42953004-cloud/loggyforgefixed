import { getPool, ensureSchema } from "@/db";
import { requireAdmin, isSameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

function threadId(raw: string): number | null {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** One conversation with the full reply history. Owner only. */
export async function GET(_request: Request, context: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = threadId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });
  await ensureSchema();
  const pool = getPool();
  const thread = await pool.query(
    'SELECT t.id,t.subject,t.status,t.last_activity_at,m.name AS member_name,m.email AS member_email FROM "member_messages" t JOIN "members" m ON m.id=t.member_id WHERE t.id=$1',
    [id],
  );
  if (!thread.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
  const replies = await pool.query('SELECT id,author,body,created_at FROM "member_message_replies" WHERE thread_id=$1 ORDER BY created_at ASC', [id]);
  return Response.json({ thread: thread.rows[0], replies: replies.rows });
}

/** Owner reply to a member. Marks the conversation answered. Email is not sent; the member sees it in their dashboard. */
export async function POST(request: Request, context: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const id = threadId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });
  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 8000) : "";
  if (body.length < 1) return Response.json({ error: "Write a reply first." }, { status: 400 });
  await ensureSchema();
  const pool = getPool();
  const exists = await pool.query('SELECT id FROM "member_messages" WHERE id=$1', [id]);
  if (!exists.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
  await pool.query('INSERT INTO "member_message_replies" ("thread_id","author","body") VALUES ($1,\'owner\',$2)', [id, body]);
  await pool.query('UPDATE "member_messages" SET "last_activity_at"=now(), "status"=\'answered\' WHERE id=$1', [id]);
  return Response.json({ ok: true }, { status: 201 });
}

/** Open or close a conversation. */
export async function PATCH(request: Request, context: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const id = threadId((await context.params).id);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });
  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!["open", "answered", "closed"].includes(String(b.status))) return Response.json({ error: "Invalid status." }, { status: 400 });
  await ensureSchema();
  const result = await getPool().query('UPDATE "member_messages" SET "status"=$1 WHERE id=$2 RETURNING id', [String(b.status), id]);
  if (!result.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
  return Response.json({ ok: true });
}
