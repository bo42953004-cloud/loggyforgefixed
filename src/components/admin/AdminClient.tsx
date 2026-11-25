"use client";
import Link from "next/link";
import { readJson } from "@/lib/safe-json";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import BillingPanel from "@/components/admin/BillingPanel";
import SitePanel from "@/components/admin/SitePanel";
import ConversationsPanel from "@/components/admin/ConversationsPanel";
import DownloadUploader from "@/components/admin/DownloadUploader";

type Item = Record<string, string | number | null>;
type Resource = "overview" | "users" | "announcements" | "referrals" | "downloads" | "videos" | "messages" | "settings" | "analytics" | "billing" | "site";
const NAV: { id: Resource; label: string; icon: string; group: string }[] = [
  { id: "overview", label: "Overview", icon: "◫", group: "WORKSPACE" },
  { id: "users", label: "Users", icon: "◎", group: "MANAGEMENT" },
  { id: "announcements", label: "Announcements", icon: "↗", group: "MANAGEMENT" },
  { id: "referrals", label: "Referrals", icon: "⇄", group: "MANAGEMENT" },
  { id: "downloads", label: "Downloads", icon: "↓", group: "CONTENT" },
  { id: "videos", label: "Tutorial videos", icon: "▷", group: "CONTENT" },
  { id: "messages", label: "Messages", icon: "✉", group: "CONTENT" },
  { id: "analytics", label: "Analytics", icon: "⌁", group: "INSIGHTS" },
  { id: "settings", label: "Settings", icon: "⚙", group: "SYSTEM" },
  { id: "site", label: "Site & branding", icon: "◐", group: "SYSTEM" },
  { id: "billing", label: "Payments & Daraja", icon: "KSh", group: "SYSTEM" },
];
const TITLES: Record<Resource, string> = { overview: "Overview", users: "User directory", announcements: "Announcements", referrals: "Referral records", downloads: "Shared downloads", videos: "Tutorial library", messages: "Messages", analytics: "Usage analytics", settings: "Platform settings", billing: "Payments & Daraja", site: "Site & branding" };
const emptyForm = { title: "", body: "", url: "", status: "published", name: "", email: "", notes: "", key: "", value: "" };

export default function AdminClient() {
  const router = useRouter(); const [active, setActive] = useState<Resource>("overview"); const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({}); const [form, setForm] = useState(emptyForm); const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const load = useCallback(async (resource: Resource) => {
    if (resource === "billing") { setItems([]); return; }
    if (["overview", "analytics"].includes(resource)) {
      const keys = ["users", "announcements", "referrals", "downloads", "videos", "messages"];
      const results = await Promise.all(keys.map(async key => { const r = await fetch(`/api/admin/${key}`, { cache: "no-store" }); if (r.status === 401) { router.replace("/admin/login"); throw new Error("Sign in required."); } const d = await readJson(r); return [key, (d.items || []) as Item[]] as const; }));
      const next: Record<string, number> = {}; results.forEach(([key, rows]) => next[key] = rows.length); setCounts(next); setItems([]); return;
    }
    const response = await fetch(`/api/admin/${resource}`, { cache: "no-store" });
    if (response.status === 401) { router.replace("/admin/login"); return; }
    const data = await readJson(response); if (!response.ok) throw new Error(data.error || "Could not load records."); setItems(data.items || []);
  }, [router]);
  useEffect(() => { setLoading(true); setError(""); load(active).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [active, load]);
  const total = useMemo(() => Object.values(counts).reduce((a: number,b: number)=>a+b,0), [counts]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const payload = active === "users" ? { name: form.name, email: form.email, notes: form.notes, status: form.status } : active === "settings" ? { key: form.key, value: form.value } : { title: form.title, body: form.body, url: form.url, status: form.status };
    try { const response = await fetch(`/api/admin/${active}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await readJson(response); if (!response.ok) throw new Error(data.error || "Save failed."); setForm(emptyForm); setShowForm(false); setNotice("Saved successfully."); await load(active); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); } finally { setBusy(false); }
  }
  async function updateStatus(item: Item, status: string) {
    try { const response = await fetch(`/api/admin/${active}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status }) }); const data = await readJson(response); if (!response.ok) throw new Error(data.error || "Update failed."); await load(active); }
    catch (e) { setError(e instanceof Error ? e.message : "Update failed."); }
  }
  async function remove(item: Item) {
    if (!window.confirm("Delete this record permanently?")) return;
    const response = await fetch(`/api/admin/${active}?id=${item.id}`, { method: "DELETE" }); const data = await readJson(response); if (!response.ok) setError(data.error || "Delete failed."); else { setNotice("Record deleted."); await load(active); }
  }
  async function logout() { await fetch("/api/admin/auth/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
  const stats = [{ label: "Registered members", key: "users", hint: "Customer accounts" }, { label: "Announcements", key: "announcements", hint: "Drafts and published" }, { label: "Referral records", key: "referrals", hint: "Tracked records" }, { label: "Shared resources", key: "downloads", hint: "Download links" }, { label: "Tutorial videos", key: "videos", hint: "Video links" }, { label: "Messages", key: "messages", hint: "Inbox records" }];
  const groups = [...new Set(NAV.map(n=>n.group))];
  return <main className="min-h-screen bg-[#080d18] text-slate-100"><div className="flex min-h-screen">
    <aside className="hidden w-64 shrink-0 border-r border-white/[.07] bg-[#0b1220] px-4 py-6 lg:block"><Link href="/" className="block px-3 text-lg font-bold tracking-[.12em]">LOGGY<span className="text-amber-400">FORGE</span><span className="mt-1 block text-[9px] font-medium tracking-[.3em] text-slate-500">OWNER CONTROL ROOM</span></Link>
      <nav className="mt-10 space-y-6">{groups.map(group=><div key={group}><p className="px-3 text-[9px] font-semibold tracking-[.24em] text-slate-600">{group}</p><div className="mt-2 space-y-1">{NAV.filter(n=>n.group===group).map(n=><button key={n.id} onClick={()=>{setActive(n.id);setShowForm(false);setNotice("");}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition ${active===n.id?"bg-amber-400/10 text-amber-300":"text-slate-400 hover:bg-white/[.04] hover:text-white"}`}><span className="w-5 text-center text-base">{n.icon}</span>{n.label}</button>)}</div></div>)}</nav>
      <div className="mt-12 rounded-2xl border border-emerald-400/10 bg-emerald-400/[.04] p-3"><div className="flex items-center gap-2 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> OWNER SESSION ACTIVE</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Private session · 8-hour expiry</p></div>
    </aside>
    <section className="min-w-0 flex-1"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4 sm:px-8"><div><p className="text-[9px] font-semibold tracking-[.25em] text-amber-400">LOGGYFORGE / ADMIN</p><h1 className="mt-1 text-xl font-semibold">{TITLES[active]}</h1></div><div className="flex items-center gap-2"><Link href="/studio" className="rounded-xl border border-white/10 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/[.05]">Open Studio ↗</Link><button onClick={logout} className="rounded-xl bg-white/[.06] px-3 py-2 text-[11px] text-slate-300 hover:bg-white/10">Sign out</button></div></header>
      <div className="border-b border-white/[.06] px-4 py-2 lg:hidden"><div className="flex gap-2 overflow-x-auto">{NAV.map(n=><button key={n.id} onClick={()=>setActive(n.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] ${active===n.id?"bg-amber-400/10 text-amber-300":"text-slate-400"}`}>{n.label}</button>)}</div></div>
      <div className="mx-auto max-w-7xl p-5 sm:p-8">
        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-300">{error}</div>}{notice && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">{notice}</div>}
        {active==="billing" ? <BillingPanel /> : active==="site" ? <SitePanel /> : active==="messages" ? <ConversationsPanel /> : active==="overview" || active==="analytics" ? <><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-slate-400">A snapshot of the records stored in your LOGGYFORGE admin workspace.</p><p className="mt-1 text-[10px] text-slate-600">Counts represent records in this admin database, not verified live traffic.</p></div><button onClick={()=>{setLoading(true);load(active).finally(()=>setLoading(false));}} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">↻ Refresh</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(s=><div key={s.key} className="rounded-2xl border border-white/[.07] bg-[#101a2b] p-5"><p className="text-xs text-slate-400">{s.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{loading?"—":counts[s.key]??0}</p><p className="mt-2 text-[10px] text-slate-600">{s.hint}</p></div>)}</div><div className="mt-5 rounded-2xl border border-white/[.07] bg-[#101a2b] p-5"><p className="text-sm font-medium">Workspace records</p><p className="mt-2 text-3xl font-semibold">{loading?"—":total}</p><p className="mt-1 text-xs text-slate-500">Total records across the six management sections.</p></div></> : <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-xs leading-5 text-slate-400">{active==="users"?"Registered customer accounts, subscription status and device-binding controls.":active==="settings"?"Store simple platform key/value settings for future user-facing integrations.":"Create and maintain content in the LOGGYFORGE admin database."}</p>{active!=="users" && <button onClick={()=>{setForm(emptyForm);setShowForm(!showForm);}} className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-[#1b160a] hover:bg-amber-300">{showForm?"Close":"＋ Add new"}</button>}</div>
          {showForm && <form onSubmit={save} className="mb-5 grid gap-3 rounded-2xl border border-amber-400/20 bg-[#111b2c] p-5 sm:grid-cols-2">{active==="users"?<><Field label="Full name" value={form.name} onChange={v=>setForm({...form,name:v})} required/><Field label="Email address" value={form.email} onChange={v=>setForm({...form,email:v})} required/><Field label="Notes" value={form.notes} onChange={v=>setForm({...form,notes:v})}/></>:active==="settings"?<><Field label="Setting key" value={form.key} onChange={v=>setForm({...form,key:v})} required/><Field label="Setting value" value={form.value} onChange={v=>setForm({...form,value:v})}/></>:<><Field label="Title" value={form.title} onChange={v=>setForm({...form,title:v})} required/><Field label="URL (downloads/videos)" value={form.url} onChange={v=>setForm({...form,url:v})} required={active==="downloads"||active==="videos"}/><label className="block text-xs text-slate-400 sm:col-span-2">Details / message<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50"/></label><label className="block text-xs text-slate-400">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white"><option value="published">Published</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="active">Active</option><option value="unread">Unread</option></select></label></>}
            <div className="flex items-end sm:col-span-2"><button disabled={busy} className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-semibold text-[#17120a] disabled:opacity-60">{busy?"Saving…":"Save record"}</button></div></form>}
          {active==="downloads" && <DownloadUploader onSaved={() => load(active)} />}
          <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#101a2b]"><div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><p className="text-xs font-medium">{items.length} record{items.length===1?"":"s"}</p><span className="text-[10px] text-slate-600">Latest first</span></div>{loading?<p className="p-8 text-center text-xs text-slate-500">Loading records…</p>:items.length===0?<p className="p-10 text-center text-xs text-slate-500">Nothing here yet. Use “Add new” to create your first record.</p>:<div className="divide-y divide-white/[.05]">{items.map((item,i)=><div key={String(item.id??item.key??i)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{String(item.name??item.title??item.key??"Untitled")}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{String(item.email??item.url??item.body??item.value??item.notes??"")}</p><p className="mt-1 text-[9px] text-slate-600">{String(item.created_at??item.updated_at??"")}</p></div><div className="flex items-center gap-2">{active!=="settings"&&<span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-slate-400">{String(item.status??"saved")}</span>}{active!=="settings"&&(active==="users"?<select aria-label="Change member status" value={String(item.status??"")} onChange={e=>updateStatus(item,e.target.value)} className="max-w-28 rounded-lg border border-white/10 bg-[#0a1220] px-2 py-1.5 text-[10px] text-slate-300"><option value="active">Active</option><option value="pending">Pending</option><option value="disabled">Disabled</option></select>:<select aria-label="Change status" value={String(item.status??"")} onChange={e=>updateStatus(item,e.target.value)} className="max-w-28 rounded-lg border border-white/10 bg-[#0a1220] px-2 py-1.5 text-[10px] text-slate-300"><option value="active">Active</option><option value="published">Published</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="unread">Unread</option><option value="read">Read</option><option value="resolved">Resolved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select>)}{active==="users"&&<button onClick={async()=>{if(!window.confirm("Reset this customer's device binding? Their current sessions will be signed out."))return;const r=await fetch(`/api/admin/members/${item.id}/reset-device`,{method:"POST"});const d=await readJson(r);if(!r.ok)setError(d.error||"Reset failed.");else setNotice(d.message);}} className="rounded-lg px-2 py-1.5 text-[10px] text-amber-300 hover:bg-amber-400/10">Reset device</button>}{active!=="settings"&&active!=="users"&&<button onClick={()=>remove(item)} className="rounded-lg px-2 py-1.5 text-[10px] text-rose-300 hover:bg-rose-400/10">Delete</button>}</div></div>)}</div>}</div>
        </>}
        <p className="mt-8 text-center text-[10px] text-slate-700">LOGGYFORGE ADMIN · Private owner workspace · <Link href="/studio" className="text-slate-500 hover:text-amber-300">Return to Studio</Link></p>
      </div>
    </section>
  </div></main>;
}
function Field({label,value,onChange,required=false}:{label:string;value:string;onChange:(v:string)=>void;required?:boolean}) { return <label className="block text-xs text-slate-400">{label}<input required={required} value={value} onChange={e=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50"/></label>; }
