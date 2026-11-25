import { getPool, ensureSchema } from "@/db";
import { NextResponse } from "next/server";
import { getCurrentMember, hasActiveAccess } from "@/lib/member/auth";

export const dynamic = "force-dynamic";
const PUBLIC_TABLES: Record<string, string> = { announcements: "admin_announcements", downloads: "admin_downloads", videos: "admin_videos" };
/** Only news is free for everyone. Downloads and videos need an active subscription. */
const PAID_RESOURCES = new Set(["downloads", "videos"]);

type Context = { params: Promise<{ resource: string }> };

export async function GET(_request: Request, context: Context) {
  const { resource } = await context.params;
  const table = PUBLIC_TABLES[resource];
  if (!table) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (PAID_RESOURCES.has(resource)) {
    const member = await getCurrentMember();
    if (!member || !hasActiveAccess(member)) {
      return NextResponse.json({ error: "Subscribe to unlock this section.", code: "SUBSCRIPTION_REQUIRED", items: [] }, { status: 403 });
    }
  }

  await ensureSchema();
  const result = await getPool().query(`SELECT * FROM "${table}" WHERE "status"='published' ORDER BY "created_at" DESC LIMIT 100`);
  return NextResponse.json({ items: result.rows });
}

/** Contact messages now go through /api/member/messages so every message belongs to a member. */
export async function POST(_request: Request, context: Context) {
  const { resource } = await context.params;
  if (resource !== "messages") return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ error: "Use /api/member/messages." }, { status: 410 });
}
