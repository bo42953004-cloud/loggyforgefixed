import DashboardClient from "@/components/dashboard/DashboardClient";
import { getCurrentMember } from "@/lib/member/auth";
import { redirect } from "next/navigation";
export const metadata={title:"Dashboard · LOGGYFORGE",description:"Your LOGGYFORGE hub: updates, referral earnings, shared downloads and tutorial videos."};
export const dynamic="force-dynamic";
export default async function DashboardPage(){const member=await getCurrentMember();if(!member)redirect("/login");return <DashboardClient/>;}
