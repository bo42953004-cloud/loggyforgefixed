import AdminClient from "@/components/admin/AdminClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Control Room · LOGGYFORGE", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminClient />; }
