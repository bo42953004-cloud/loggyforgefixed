"use client";

import { useEffect, useState } from "react";

/** Owner-editable footer copy, fetched from the public site settings endpoint. */
export default function SiteFooterText() {
  const [value, setValue] = useState("© LOGGYFORGE. All rights reserved.");
  useEffect(() => {
    let alive = true;
    fetch("/api/site", { cache: "no-store" }).then((r) => r.json()).then((d: { footerText?: string }) => {
      if (alive && d.footerText) setValue(d.footerText);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return <p className="text-xs text-slate-600">{value}</p>;
}
