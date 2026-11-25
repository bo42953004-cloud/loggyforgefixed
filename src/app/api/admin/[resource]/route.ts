import { getPool, ensureSchema } from "@/db";
import { isSameOrigin, requireAdmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const RESOURCES = {
  users: { table: "admin_members", fields: ["name", "email", "status", "notes"], required: ["name", "email"] },
  announcements: { table: "admin_announcements", fields: ["title", "body", "status"], required: ["title", "body"] },
  referrals: { table: "admin_referrals", fields: ["title", "body", "status"], required: ["title"] },
  downloads: { table: "admin_downloads", fields: ["title", "body", "url", "status"], required: ["title", "url"] },
  videos: { table: "admin_videos", fields: ["title", "body", "url", "status"], required: ["title", "url"] },
  messages: { table: "admin_messages", fields: ["title", "body", "status"], required: ["title", "body"] },
  settings: { table: "admin_settings", fields: ["key", "value"], required: ["key"] },
} as const;
type Resource = keyof typeof RESOURCES;
type Context = { params: Promise<{ resource: string }> };
function config(value: string) { return Object.prototype.hasOwnProperty.call(RESOURCES, value) ? RESOURCES[value as Resource] : null; }
function clean(value: unknown, max = 12000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET(_request: Request, context: Context) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { resource } = await context.params; const cfg = config(resource);
  if (!cfg) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  await ensureSchema();
  const order = resource === "settings" ? '"key" ASC' : '"created_at" DESC';
  const result = resource === "users"
    ? await getPool().query('SELECT id,name,email,phone,status,referral_code,created_at,updated_at FROM members ORDER BY created_at DESC LIMIT 500')
    : resource === "settings"
      ? await getPool().query("SELECT * FROM admin_settings WHERE key NOT LIKE 'mpesa.%' AND key NOT LIKE 'billing.%' AND key NOT LIKE 'email.%' ORDER BY key ASC LIMIT 500")
      : await getPool().query(`SELECT * FROM "${cfg.table}" ORDER BY ${order} LIMIT 500`);
  return NextResponse.json({ items: result.rows });
}

export async function POST(request: Request, context: Context) {
  const denied = await requireAdmin(); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { resource } = await context.params; const cfg = config(resource);
  if (!cfg) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  if (resource === "users") return NextResponse.json({ error: "Customer accounts are created through member registration." }, { status: 405 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const values: Record<string, string> = {};
  for (const field of cfg.fields) values[field] = clean(body[field], field === "body" || field === "value" || field === "notes" ? 12000 : 1000);
  if (cfg.required.some((field) => !values[field])) return NextResponse.json({ error: `Required: ${cfg.required.join(", ")}.` }, { status: 400 });
  if (resource === "users" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (resource === "downloads" || resource === "videos") {
    try { const parsed = new URL(values.url); if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error(); }
    catch { return NextResponse.json({ error: "Enter a valid http or https URL." }, { status: 400 }); }
  }
  if (resource === "settings") {
    if (/^(mpesa|billing|email)\./i.test(values.key)) return NextResponse.json({ error: "Use Payments & Daraja to edit payment and email integration settings." }, { status: 400 });
    await ensureSchema();
    const result = await getPool().query('INSERT INTO "admin_settings" ("key", "value") VALUES ($1,$2) ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value", "updated_at"=now() RETURNING *', [values.key, values.value]);
    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  }
  const columns = cfg.fields.map((f) => `"${f}"`).join(", ");
  const placeholders = cfg.fields.map((_, i) => `$${i + 1}`).join(", ");
  await ensureSchema();
  try {
    const result = await getPool().query(`INSERT INTO "${cfg.table}" (${columns}) VALUES (${placeholders}) RETURNING *`, cfg.fields.map((f) => values[f]));
    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message.includes("unique") ? "That email is already in the directory." : "Could not save this record." }, { status: 400 }); }
}

export async function PATCH(request: Request, context: Context) {
  const denied = await requireAdmin(); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { resource } = await context.params; const cfg = config(resource);
  if (!cfg) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const id = Number(body.id);
  if (resource !== "settings" && (!Number.isSafeInteger(id) || id < 1)) return NextResponse.json({ error: "A valid record ID is required." }, { status: 400 });
  if (resource === "users") {
    if (typeof body.status !== "string" || !["active", "disabled", "pending"].includes(body.status)) return NextResponse.json({ error: "Choose active, pending or disabled." }, { status: 400 });
    const user = await getPool().query('UPDATE members SET status=$1,updated_at=now() WHERE id=$2 AND is_owner=false RETURNING id,name,email,status', [body.status, id]);
    if (!user.rowCount) return NextResponse.json({ error: "Customer not found or owner status is protected." }, { status: 404 });
    return NextResponse.json({ item: user.rows[0] });
  }
  const editable = resource === "settings" ? ["value"] : ["status", "body", "notes", "url"];
  const field = editable.find((f) => typeof body[f] === "string");
  if (!field) return NextResponse.json({ error: "No supported field supplied." }, { status: 400 });
  await ensureSchema();
  const keyColumn = resource === "settings" ? '"key"' : '"id"';
  const keyValue = resource === "settings" ? clean(body.key, 100) : id;
  if (resource === "settings" && !keyValue) return NextResponse.json({ error: "Setting key required." }, { status: 400 });
  if (resource === "settings" && /^(mpesa|billing|email)\./i.test(String(keyValue))) return NextResponse.json({ error: "Use Payments & Daraja to edit payment and email integration settings." }, { status: 400 });
  const result = await getPool().query(`UPDATE "${cfg.table}" SET "${field}"=$1, "updated_at"=now() WHERE ${keyColumn}=$2 RETURNING *`, [clean(body[field], 12000), keyValue]);
  if (!result.rowCount) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  return NextResponse.json({ item: result.rows[0] });
}

export async function DELETE(request: Request, context: Context) {
  const denied = await requireAdmin(); if (denied) return denied;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const { resource } = await context.params; const cfg = config(resource);
  if (!cfg || resource === "settings" || resource === "users") return NextResponse.json({ error: "Customer accounts cannot be deleted from this directory." }, { status: 400 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "A valid ID is required." }, { status: 400 });
  await ensureSchema();
  const result = await getPool().query(`DELETE FROM "${cfg.table}" WHERE "id"=$1 RETURNING "id"`, [id]);
  if (!result.rowCount) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
