import { getPool, ensureSchema } from "@/db";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** Every member conversation, most recent first, with a preview of the last reply. Owner only. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSchema();
  const result = await getPool().query(`
    SELECT t.id, t.subject, t.status, t.last_activity_at, t.created_at,
      m.name AS member_name, m.email AS member_email,
      (SELECT r.body FROM member_message_replies r WHERE r.thread_id=t.id ORDER BY r.created_at DESC LIMIT 1) AS last_body,
      (SELECT r.author FROM member_message_replies r WHERE r.thread_id=t.id ORDER BY r.created_at DESC LIMIT 1) AS last_author
    FROM member_messages t JOIN members m ON m.id=t.member_id
    ORDER BY t.last_activity_at DESC LIMIT 300`);
  return Response.json({ items: result.rows });
}
