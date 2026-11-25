import { getPool, ensureSchema } from "@/db";

/** Owner-editable branding, stored in admin_settings under site.* keys. */
export type SiteInfo = { title: string; description: string; about: string; logoUrl: string };

const DEFAULTS: SiteInfo = {
  title: "LOGGYFORGE",
  description:
    "LOGGYFORGE — the platform for Loggy 3: an AI code studio, a computing spreadsheet, referrals, admin updates, shared downloads and tutorial videos.",
  about:
    "LOGGYFORGE is built for Loggy, the engineer training rig where every keystroke counts. Build websites with the AI studio, practise with the spreadsheet, and learn from the tutorial library.",
  logoUrl: "",
};

/** Reads the branding. Falls back to the defaults if the database is unavailable, so pages still render. */
export async function getSiteInfo(): Promise<SiteInfo> {
  try {
    await ensureSchema();
    const r = await getPool().query("SELECT key,value FROM admin_settings WHERE key LIKE 'site.%'");
    const m: Record<string, string> = Object.fromEntries(r.rows.map((x: { key: string; value: string }) => [x.key, x.value]));
    return {
      title: m["site.title"] || DEFAULTS.title,
      description: m["site.description"] || DEFAULTS.description,
      about: m["site.about"] || DEFAULTS.about,
      logoUrl: m["site.logo_url"] || "",
    };
  } catch {
    return DEFAULTS;
  }
}
