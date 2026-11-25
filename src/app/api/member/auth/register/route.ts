import { randomBytes } from "node:crypto";
import { getPool, ensureSchema } from "@/db";
import { createMemberSession, hashPassword } from "@/lib/member/auth";
import { isSameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return "";
}

/** Turns a low-level failure into a message the visitor (and the owner) can act on. */
function describeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return "The site's database is not configured yet. The owner must add DATABASE_URL in Vercel → Settings → Environment Variables and redeploy.";
  }
  return "The server could not reach the database. Please try again shortly.";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const name = typeof b.name === "string" ? b.name.trim().slice(0, 160) : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof b.password === "string" ? b.password : "";
  const phone = normalizePhone(typeof b.phone === "string" ? b.phone : "");
  const referral = typeof b.referralCode === "string" ? b.referralCode.trim().toUpperCase().slice(0, 24) : "";

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !phone) {
    return Response.json({ error: "Enter your name, a valid email, a Kenyan M-Pesa number and a password of at least 10 characters." }, { status: 400 });
  }

  let memberId: number;
  try {
    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      let referrerId: number | null = null;
      if (referral) {
        const r = await client.query('SELECT id FROM "members" WHERE "referral_code"=$1 AND "status"<>\'disabled\' LIMIT 1', [referral]);
        if (!r.rowCount) {
          await client.query("ROLLBACK");
          return Response.json({ error: "That referral code was not found." }, { status: 400 });
        }
        referrerId = Number(r.rows[0].id);
      }
      const code = `LG${randomBytes(5).toString("hex").toUpperCase()}`;
      const result = await client.query(
        'INSERT INTO "members" ("name","email","password_hash","phone","referral_code","referred_by") VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [name, email, hashPassword(password), phone, code, referrerId],
      );
      await client.query("COMMIT");
      memberId = Number(result.rows[0].id);
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch { /* connection already closed */ }
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "23505") {
      const detail = String((e as { constraint?: string }).constraint ?? "");
      return Response.json(
        { error: detail.includes("referral") ? "Could not create your account. Please try again." : "An account with that email already exists. Try signing in." },
        { status: 409 },
      );
    }
    console.error("register failed:", e);
    return Response.json({ error: describeFailure(e) }, { status: 503 });
  }

  try {
    await createMemberSession(memberId);
    return Response.json({ ok: true, needsSubscription: true }, { status: 201 });
  } catch (e) {
    console.error("register session failed:", e);
    return Response.json({ error: "Your account was created, but the session could not be started. Please sign in." }, { status: 503 });
  }
}
