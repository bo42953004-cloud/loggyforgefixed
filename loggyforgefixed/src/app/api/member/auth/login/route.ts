import { getPool, ensureSchema } from "@/db";
import { createMemberSession, verifyPassword } from "@/lib/member/auth";
import { isSameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return Response.json({ error: "Enter your email and password." }, { status: 400 });

  let row: { id: number | string; password_hash: string; status: string } | undefined;
  try {
    await ensureSchema();
    const r = await getPool().query('SELECT id,password_hash,status FROM "members" WHERE email=$1 LIMIT 1', [email]);
    row = r.rows[0];
  } catch (e) {
    console.error("login lookup failed:", e);
    const message = e instanceof Error && e.message.includes("DATABASE_URL")
      ? "The site's database is not configured yet. The owner must add DATABASE_URL in Vercel → Settings → Environment Variables and redeploy."
      : "The server could not reach the database. Please try again shortly.";
    return Response.json({ error: message }, { status: 503 });
  }

  if (!row || !verifyPassword(password, row.password_hash)) {
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  if (row.status === "disabled") return Response.json({ error: "This account is disabled. Contact support." }, { status: 403 });

  try {
    await createMemberSession(Number(row.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not create a session." }, { status: 403 });
  }
}
