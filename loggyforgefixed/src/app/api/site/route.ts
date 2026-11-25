import { getSiteInfo } from "@/lib/site";
export const dynamic = "force-dynamic";
/** Public branding used by the logo, the About section and the browser title. */
export async function GET() {
  return Response.json(await getSiteInfo());
}
