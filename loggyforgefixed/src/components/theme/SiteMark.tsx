"use client";

import { useEffect, useState } from "react";

/** The brand mark: the owner's uploaded logo when one is set, otherwise the classic ◆. */
export default function SiteMark({ className }: { className: string }) {
  const [logo, setLogo] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/site", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { logoUrl?: string }) => {
        if (alive && d.logoUrl) setLogo(d.logoUrl);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return <span className={className}>{logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : "◆"}</span>;
}
