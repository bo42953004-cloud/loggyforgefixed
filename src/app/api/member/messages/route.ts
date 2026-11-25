import { getPool, ensureSchema } from "@/db";
import { getCurrentMember, hasActiveAccess } from "@/lib/member/auth";
import { isSameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** The member's own conversations with the owner, with every reply. Nobody else's threads are returned. */
export async function GET() {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!hasActiveAccess(member)) return Response.json({ error: "Subscribe to message the admin.", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  await ensureSchema();
  const pool = getPool();
  const threads = await pool.query(
    'SELECT id,subject,status,last_activity_at,created_at FROM "member_messages" WHERE member_id=$1 ORDER BY last_activity_at DESC LIMIT 50',
    [member.id],
  );
  const ids = threads.rows.map((t) => t.id);
  const replies = ids.length
    ? await pool.query('SELECT id,thread_id,author,body,created_at FROM "member_message_replies" WHERE thread_id = ANY($1::bigint[]) ORDER BY created_at ASC', [ids])
    : { rows: [] as Array<{ thread_id: number | string }> };
  return Response.json({
    threads: threads.rows.map((t) => ({ ...t, replies: replies.rows.filter((r) => String(r.thread_id) === String(t.id)) })),
  });
}

/** Start a new conversation (no threadId) or reply in an existing one (threadId). Members can only use their own threads. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!hasActiveAccess(member)) return Response.json({ error: "Subscribe to message the admin.", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 4000) : "";
  if (message.length < 2) return Response.json({ error: "Write a message first." }, { status: 400 });

  await ensureSchema();
  const pool = getPool();
  const threadId = b.threadId === undefined ? null : Number(b.threadId);

  if (threadId !== null) {
    if (!Number.isSafeInteger(threadId) || threadId < 1) return Response.json({ error: "Invalid conversation." }, { status: 400 });
    const own = await pool.query('SELECT id FROM "member_messages" WHERE id=$1 AND member_id=$2', [threadId, member.id]);
    if (!own.rowCount) return Response.json({ error: "Conversation not found." }, { status: 404 });
    await pool.query('INSERT INTO "member_message_replies" ("thread_id","author","body") VALUES ($1,\'member\',$2)', [threadId, message]);
    await pool.query('UPDATE "member_messages" SET "last_activity_at"=now(), "status"=\'open\' WHERE id=$1', [threadId]);
    return Response.json({ ok: true, threadId }, { status: 201 });
  }

  const subject = message.split("\n")[0].slice(0, 60) || "Message to admin";
  const created = await pool.query('INSERT INTO "member_messages" ("member_id","subject") VALUES ($1,$2) RETURNING id', [member.id, subject]);
  const newId = Number(created.rows[0].id);
  await pool.query('INSERT INTO "member_message_replies" ("thread_id","author","body") VALUES ($1,\'member\',$2)', [newId, message]);
  return Response.json({ ok: true, threadId: newId }, { status: 201 });
}
