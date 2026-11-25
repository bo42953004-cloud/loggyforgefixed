import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, isSameOrigin, verifyAdminCredentials } from "@/lib/admin/auth";
import { ensureSchema, getPool } from "@/db";
import { createMemberSession, hashPassword } from "@/lib/member/auth";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 254 || body.password.length > 256) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  try {
    if (!verifyAdminCredentials(body.email, body.password)) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    await ensureSchema();
    const ownerEmail = body.email.trim().toLowerCase();
    let owner = await getPool().query('SELECT id FROM members WHERE email=$1 LIMIT 1', [ownerEmail]);
    let ownerId: number;
    if (owner.rowCount) {
      ownerId = Number(owner.rows[0].id);
      await getPool().query('UPDATE members SET is_owner=true,status=\'active\',updated_at=now() WHERE id=$1', [ownerId]);
    } else {
      const referralCode = `LGOWNER${randomBytes(4).toString("hex").toUpperCase()}`;
      const created = await getPool().query('INSERT INTO members (name,email,password_hash,phone,referral_code,status,is_owner) VALUES ($1,$2,$3,\'\', $4,\'active\',true) RETURNING id', ["LOGGYFORGE Owner", ownerEmail, hashPassword(randomBytes(32).toString("base64url")), referralCode]);
      ownerId = Number(created.rows[0].id);
    }
    // Preserve the single-user demo's existing work under the reserved owner account.
    await getPool().query('UPDATE projects SET owner_id=$1 WHERE owner_id IS NULL', [ownerId]);
    await getPool().query('UPDATE sheets SET owner_id=$1 WHERE owner_id IS NULL', [ownerId]);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
    try { await createMemberSession(ownerId); } catch { /* admin access remains available; device reset can restore Studio access */ }
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin authentication is not configured." }, { status: 503 });
  }
}
