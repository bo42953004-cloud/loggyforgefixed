import { getPool, ensureSchema } from "@/db";
import { decryptSecret } from "@/lib/crypto-settings";

export type MpesaConfig = { environment: "sandbox" | "production"; shortcode: string; tillNumber: string; storeNumber: string; shortcodeType: "paybill" | "till"; consumerKey: string; consumerSecret: string; passkey: string; callbackUrl: string };
export async function getMpesaConfig(): Promise<MpesaConfig> {
  await ensureSchema();
  const result = await getPool().query('SELECT "key","value" FROM "admin_settings" WHERE "key" LIKE \'mpesa.%\'');
  const values = Object.fromEntries(result.rows.map((r: {key:string;value:string}) => [r.key, r.value])) as Record<string,string>;
  const cfg: MpesaConfig = {
    environment: values["mpesa.environment"] === "production" ? "production" : "sandbox",
    shortcode: values["mpesa.shortcode"] || values["mpesa.till_number"] || "", tillNumber: values["mpesa.till_number"] || "", storeNumber: values["mpesa.store_number"] || "", shortcodeType: values["mpesa.shortcode_type"] === "till" ? "till" : "paybill",
    consumerKey: decryptSecret(values["mpesa.consumer_key"] || ""), consumerSecret: decryptSecret(values["mpesa.consumer_secret"] || ""),
    passkey: decryptSecret(values["mpesa.passkey"] || ""), callbackUrl: values["mpesa.callback_url"] || "",
  };
  if (!cfg.shortcode || !cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey || !cfg.callbackUrl) throw new Error("M-Pesa integration is incomplete. Complete the Daraja settings in Admin → Payments & Daraja.");
  return cfg;
}
export function mpesaBase(environment: string) { return environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"; }
export async function accessToken(cfg: MpesaConfig) {
  const basic = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");
  const response = await fetch(`${mpesaBase(cfg.environment)}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Daraja authentication failed. Check your consumer key and secret.");
  return String(data.access_token);
}
export function timestamp() { const d = new Date(Date.now() + 3 * 60 * 60 * 1000); return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}${String(d.getUTCHours()).padStart(2,"0")}${String(d.getUTCMinutes()).padStart(2,"0")}${String(d.getUTCSeconds()).padStart(2,"0")}`; }
export function stkPassword(shortcode: string, passkey: string, time: string) { return Buffer.from(`${shortcode}${passkey}${time}`).toString("base64"); }
export async function queryStk(cfg: MpesaConfig, checkoutRequestId: string) {
  const token = await accessToken(cfg); const time = timestamp();
  const response = await fetch(`${mpesaBase(cfg.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: cfg.shortcode, Password: stkPassword(cfg.shortcode,cfg.passkey,time), Timestamp: time, CheckoutRequestID: checkoutRequestId }), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errorMessage || "Unable to verify STK transaction with Daraja.");
  return data;
}
