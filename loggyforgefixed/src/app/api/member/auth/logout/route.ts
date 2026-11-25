import { logoutMember } from "@/lib/member/auth";
export async function POST(){await logoutMember();return Response.json({ok:true});}
