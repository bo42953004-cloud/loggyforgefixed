"use client";
import SiteMark from "@/components/theme/SiteMark";
export default function BrandLoader({label="Loading LOGGYFORGE…"}:{label?:string}){return <div role="status" aria-live="polite" className="brand-loader"><span className="brand-loader-mark"><SiteMark className="brand-loader-logo"/></span><span className="brand-loader-name">LOGGY<span>FORGE</span></span><span className="brand-loader-label">{label}</span></div>}
