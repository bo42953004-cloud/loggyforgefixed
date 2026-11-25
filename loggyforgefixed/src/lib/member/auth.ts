import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getPool, ensureSchema } from "@/db";

export const MEMBER_COOKIE = "loggyforge_member";
export const MEMBER_DEVICE_COOKIE = "loggyforge_device";
const SESSION_DAYS = 30;
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}
export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
export async function createMemberSession(memberId: number) {
  await ensureSchema();
  const jar = await cookies();
  let deviceToken = jar.get(MEMBER_DEVICE_COOKIE)?.value || "";
  const found = await getPool().query('SELECT device_token_hash,is_owner FROM members WHERE id=$1', [memberId]);
  const storedHash = String(found.rows[0]?.device_token_hash || "");
  const isOwner = found.rows[0]?.is_owner === true;
  if (storedHash && (!deviceToken || sha256(deviceToken) !== storedHash) && !isOwner) {
    throw new Error("This account is linked to another device. Contact the owner to reset your device binding.");
  }
  if (!storedHash || isOwner && (!deviceToken || sha256(deviceToken) !== storedHash)) {
    deviceToken = randomBytes(32).toString("base64url");
    await getPool().query('UPDATE members SET device_token_hash=$1,updated_at=now() WHERE id=$2', [sha256(deviceToken), memberId]);
    jar.set(MEMBER_DEVICE_COOKIE, deviceToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 365 * 86400 });
  }
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await getPool().query('INSERT INTO "member_sessions" ("token_hash","member_id","expires_at") VALUES ($1,$2,$3)', [sha256(token), memberId, expires]);
  jar.set(MEMBER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires });
}
export async function getCurrentMember() {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  const deviceToken = jar.get(MEMBER_DEVICE_COOKIE)?.value;
  if (!token || !deviceToken) return null;
  await ensureSchema();
  const result = await getPool().query(
    `SELECT m.id,m.name,m.email,m.phone,m.referral_code,m.status,m.referred_by,m.device_token_hash,m.is_owner,
      s.expires_at AS session_expires_at,
      (SELECT max(sub.expires_at) FROM subscriptions sub WHERE sub.member_id=m.id AND sub.status='active') AS subscription_expires_at
     FROM member_sessions s JOIN members m ON m.id=s.member_id
     WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`, [sha256(token)],
  );
  const member = result.rows[0];
  if (!member || !member.device_token_hash || sha256(deviceToken) !== member.device_token_hash) return null;
  return member;
}
export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) return { member: null, response: Response.json({ error: "Sign in required." }, { status: 401 }) };
  return { member, response: null };
}
export async function logoutMember() {
  const jar = await cookies(); const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) { await ensureSchema(); await getPool().query('DELETE FROM "member_sessions" WHERE "token_hash"=$1', [sha256(token)]); }
  jar.set(MEMBER_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function requireActiveMember() {
  const member = await getCurrentMember();
  if (!member) return { member: null, response: Response.json({ error: "Sign in required." }, { status: 401 }) };
  if (member.is_owner === true) return { member, response: null };
  const expiry = member.subscription_expires_at ? new Date(member.subscription_expires_at as string | Date).getTime() : 0;
  if (member.status !== "active" || !Number.isFinite(expiry) || expiry <= Date.now()) {
    return { member: null, response: Response.json({ error: "An active subscription is required.", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 }) };
  }
  return { member, response: null };
}

/** True when the member may use paid features (owners are exempt from expiry). */
export function hasActiveAccess(member: { is_owner?: unknown; status?: unknown; subscription_expires_at?: unknown }) {
  if (member.is_owner === true) return true;
  const expiry = member.subscription_expires_at ? new Date(member.subscription_expires_at as string | Date).getTime() : 0;
  return member.status === "active" && Number.isFinite(expiry) && expiry > Date.now();
}
