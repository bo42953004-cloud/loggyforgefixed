import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AdminShortcut from "@/components/theme/AdminShortcut";

export const metadata: Metadata = {
  title: "LOGGYFORGE",
  description:
    "LOGGYFORGE — the platform for Loggy 3: an AI code studio, a computing spreadsheet, referrals, admin updates, shared downloads and tutorial videos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased"><AdminShortcut />{children}</body>
    </html>
  );
}
