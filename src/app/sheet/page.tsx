import SheetClient from "@/components/sheet/SheetClient";
import { getCurrentMember, hasActiveAccess } from "@/lib/member/auth";
import { redirect } from "next/navigation";
export const metadata={title:"Spreadsheet · LOGGYFORGE"};
export const dynamic="force-dynamic";
export default async function SheetPage(){const member=await getCurrentMember();if(!member)redirect("/login");if(!hasActiveAccess(member))redirect("/account/subscribe");return <SheetClient/>;}
