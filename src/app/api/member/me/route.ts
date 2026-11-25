import { getCurrentMember, hasActiveAccess } from "@/lib/member/auth";
export const dynamic = "force-dynamic";

/** The signed-in member plus whether their subscription allows paid areas (downloads, videos, referrals, messages). */
export async function GET() {
  const m = await getCurrentMember();
  if (!m) return Response.json({ member: null }, { status: 401 });
  return Response.json({
    member: {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      referralCode: m.referral_code,
      status: m.status,
      isOwner: m.is_owner === true,
      subscriptionExpiresAt: m.subscription_expires_at,
      access: hasActiveAccess(m),
      subscriptionStartsAt: m.subscription_starts_at,
      subscriptionColor: (() => { if (!hasActiveAccess(m) || !m.subscription_expires_at) return "expired"; const start = new Date(m.subscription_starts_at || Date.now()).getTime(); const end = new Date(m.subscription_expires_at as string | Date).getTime(); const now = Date.now(); const total = Math.max(1, end - start); const remaining = end - now; if (remaining <= 3 * 86400000) return "red"; if (now - start >= total * 0.5) return "yellow"; return "green"; })(),
      subscriptionDaysRemaining: m.subscription_expires_at ? Math.max(0, Math.ceil((new Date(m.subscription_expires_at as string | Date).getTime() - Date.now()) / 86400000)) : 0,
    },
  });
}
