import { getPool, ensureSchema } from "@/db";
export const dynamic="force-dynamic";
export async function GET(){await ensureSchema();const r=await getPool().query("SELECT key,value FROM admin_settings WHERE key IN ('package.30','package.60','package.90','billing.commission_rate')");const v=Object.fromEntries(r.rows.map(x=>[x.key,x.value]));return Response.json({packages:[{days:30,price:Number(v['package.30']||1000)},{days:60,price:Number(v['package.60']||1500)},{days:90,price:Number(v['package.90']||2300)}],commissionRate:Number(v['billing.commission_rate']||10)});}
