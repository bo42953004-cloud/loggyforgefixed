import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AdminShortcut from "@/components/theme/AdminShortcut";
import { getSiteInfo } from "@/lib/site";

/* Read on every request so a title or logo change in the admin shows up immediately. */
export const dynamic = "force-dynamic";

/** Browser tab title, description and favicon come from the owner's Site & branding settings. */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteInfo();
  return {
    title: site.title,
    description: site.description,
    icons: site.logoUrl ? { icon: site.logoUrl, apple: site.logoUrl } : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased"><AdminShortcut />{children}</body>
    </html>
  );
}
