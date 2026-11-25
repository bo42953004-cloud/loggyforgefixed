import { getPool, ensureSchema } from "@/db";
import { getCurrentMember } from "@/lib/member/auth";
export const dynamic="force-dynamic";
export async function GET(){const m=await getCurrentMember();if(!m)return Response.json({error:"Sign in required."},{status:401});await ensureSchema();const pool=getPool();const [balances,people,withdrawals,settings]=await Promise.all([
 pool.query(`SELECT COALESCE((SELECT sum(amount) FROM commissions WHERE referrer_id=$1 AND status='pending'),0)::int pending,
   GREATEST(0,COALESCE((SELECT sum(c.amount) FROM commissions c WHERE c.referrer_id=$1 AND c.status='available'),0)-COALESCE((SELECT sum(a.amount) FROM commission_allocations a JOIN commissions c ON c.id=a.commission_id WHERE c.referrer_id=$1 AND a.status IN ('requested','paid')),0))::int available,
   COALESCE((SELECT sum(a.amount) FROM commission_allocations a JOIN commissions c ON c.id=a.commission_id WHERE c.referrer_id=$1 AND a.status='requested'),0)::int requested,
   COALESCE((SELECT sum(a.amount) FROM commission_allocations a JOIN commissions c ON c.id=a.commission_id WHERE c.referrer_id=$1 AND a.status='paid'),0)::int paid`,[m.id]),
 pool.query(`SELECT m.name,m.email,m.created_at,COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.member_id=m.id AND p.status='paid'),0)::int paid_total,
   (SELECT p.status FROM payments p WHERE p.member_id=m.id ORDER BY p.created_at DESC LIMIT 1) AS latest_payment_status,
   COALESCE((SELECT sum(c.amount) FROM commissions c WHERE c.referred_member_id=m.id AND c.status='available'),0)::int commission FROM members m WHERE m.referred_by=$1 ORDER BY m.created_at DESC LIMIT 100`,[m.id]),
 pool.query('SELECT id,amount,phone,status,receipt_code,confirmation_message,created_at,paid_at FROM withdrawal_requests WHERE member_id=$1 ORDER BY created_at DESC LIMIT 50',[m.id]),
 pool.query('SELECT key,value FROM admin_settings WHERE key IN ($1,$2)',["billing.minimum_withdrawal","billing.commission_rate"])
]);const s=Object.fromEntries(settings.rows.map(x=>[x.key,x.value]));return Response.json({referralCode:m.referral_code,balances:balances.rows[0],referred:people.rows,withdrawals:withdrawals.rows,minimumWithdrawal:Number(s["billing.minimum_withdrawal"]||0),commissionRate:Number(s["billing.commission_rate"]||10)});}
