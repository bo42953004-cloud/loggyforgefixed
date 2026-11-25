import StudioClient from "@/components/studio/StudioClient";
import { getCurrentMember, hasActiveAccess } from "@/lib/member/auth";
import { redirect } from "next/navigation";
export const metadata={title:"Code Studio · LOGGYFORGE"};
export const dynamic="force-dynamic";
export default async function StudioPage(){const member=await getCurrentMember();if(!member)redirect("/login");if(!hasActiveAccess(member))redirect("/account/subscribe");return <StudioClient/>;}
