import Link from "next/link";
import ReferralDashboard from "@/components/member/ReferralDashboard";
export const metadata={title:"Referral earnings · LOGGYFORGE"};
export default function ReferralPage(){return <main className="min-h-screen bg-[#070B18] px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-center justify-between"><Link href="/dashboard" className="text-xs text-amber-300">← Dashboard</Link><Link href="/account/subscribe" className="text-xs text-slate-400 hover:text-amber-300">Subscription</Link></div><ReferralDashboard/></div></main>}
