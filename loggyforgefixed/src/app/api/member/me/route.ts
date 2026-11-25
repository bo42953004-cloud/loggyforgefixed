import { getCurrentMember } from "@/lib/member/auth";
export const dynamic="force-dynamic";
export async function GET(){const m=await getCurrentMember();if(!m)return Response.json({member:null},{status:401});return Response.json({member:{id:m.id,name:m.name,email:m.email,phone:m.phone,referralCode:m.referral_code,status:m.status,subscriptionExpiresAt:m.subscription_expires_at}});}
