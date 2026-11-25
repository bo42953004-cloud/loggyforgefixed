/**
 * The LOGGYFORGE cinematic backdrop shared by the landing page and the dashboard
 * (the login page uses the same layers): starfield, drifting aurora glows,
 * a perspective floor grid and a vignette. Pure CSS, no client JS.
 */
export default function Backdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070B18] ${dim ? "[&>.aurora]:opacity-30" : ""}`}
    >
      <div className="starfield absolute inset-0" />
      <div className="aurora left-[-10%] top-[-15%] h-[520px] w-[560px] bg-[#ff6a00]/50" />
      <div className="aurora right-[-12%] top-[8%] h-[460px] w-[520px] bg-[#6d28d9]/55" style={{ animationDelay: "-4s" }} />
      <div className="aurora bottom-[-20%] left-[28%] h-[500px] w-[620px] bg-[#0ea5e9]/40" style={{ animationDelay: "-8s" }} />
      <div className="perspective-grid" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(3,6,17,0.72)_100%)]" />
    </div>
  );
}
