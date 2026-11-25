# LOGGYFORGE — deployment and payments setup

LOGGYFORGE is a Next.js 16 application using PostgreSQL. This version keeps the existing visual theme and Studio, adds member accounts, subscriptions, Daraja STK Push, referral commissions, manual commission withdrawals and an owner-only admin portal.

## Requirements

- Node.js 22.x (or a supported Next.js 16 runtime)
- PostgreSQL
- A public HTTPS deployment for Safaricom callbacks
- Daraja app credentials for the environment you are testing

## 1. Deploy the application

1. Import this project into your Git provider and deploy it with Vercel or another Node.js host.
2. Add `DATABASE_URL` in the deployment environment.
3. Add `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
4. Add `APP_ENCRYPTION_KEY` (32 random bytes, base64-encoded). Generate with `openssl rand -base64 32`.
5. Add `NEXT_PUBLIC_APP_URL` with the public HTTPS origin, e.g. `https://your-domain.example`.
6. Deploy and check `/api/health`.

The PostgreSQL tables are created automatically on first database use. No separate migration command is required for a new database.

## 2. Owner portal

- Admin sign-in: `/admin/login`
- Admin workspace: `/admin`
- Keyboard shortcut: `Ctrl+Shift+A` opens the admin sign-in page.

The admin account is configured through environment variables, not through a customer referral code. Use a long, unique password. Keep the session secret and encryption key private. Never commit `.env` files or real Daraja credentials.

The owner account is exempt from customer subscription expiry. The first owner sign-in creates the owner member record and assigns any pre-existing unowned Studio projects and sheets to that owner. Customer accounts are restricted to one browser/device binding; the owner can reset a customer's binding from Admin → Users.

## 3. Daraja configuration

Open **Admin → Payments & Daraja**. The owner can update:

- Environment: Sandbox or Production
- Shortcode type: Paybill or Buy Goods Till
- Business shortcode
- Till number, when applicable
- Store number, when applicable
- Consumer Key
- Consumer Secret
- Lipa na M-Pesa Passkey
- STK callback URL

The callback URL is prefilled from `NEXT_PUBLIC_APP_URL` (or Vercel's deployment URL) as:

`https://your-domain.example/api/billing/callback`

The endpoint must be publicly reachable over HTTPS. Enter the exact business identifiers and callback details issued for your Daraja application. For multi-store setups, follow the shortcode/Till/Store mapping Safaricom has assigned to that business account.

Consumer Key, Consumer Secret and Passkey are encrypted with AES-256-GCM before being stored in PostgreSQL. They are never sent back to the browser in plaintext. `APP_ENCRYPTION_KEY` is therefore essential: if it is lost or changed, previously stored integration secrets cannot be decrypted and must be entered again.

Start in **Sandbox** and complete a full test payment before switching to Production. Production use requires the business account, Daraja app and required M-Pesa product permissions to be approved by Safaricom. Do not bypass Safaricom onboarding or use credentials belonging to someone else.

## 4. Subscription packages and renewals

Default packages:

| Access period | Price |
|---|---:|
| 30 days | KSh 1,000 |
| 60 days | KSh 1,500 |
| 90 days | KSh 2,300 |

The owner can edit all three prices in Admin → Payments & Daraja. A member creates an account, chooses a package and receives an STK Push. The server records the pending checkout, receives the Daraja callback, queries Daraja for the STK status, and checks the amount, phone and receipt before activating access.

A successful renewal extends from the existing future expiry time. A new subscription starts immediately if the previous one has expired. Failed or unverified payments do not activate access. The Studio and spreadsheet APIs require a signed-in member with an active subscription, and project/sheet records are scoped to their owner.

## 5. Referral commission rules

- Referral links use the member's unique referral code (`/register?ref=CODE`).
- Default commission rate is **10%** of each successfully verified subscription payment made by a referred member, including later renewals.
- At the default prices, the commission is KSh 100, KSh 150 and KSh 230 respectively.
- Commission is pending while the STK payment is unresolved and becomes available only after server-side payment verification.
- The owner can adjust the commission percentage in Admin → Payments & Daraja.

The customer referral dashboard shows referred customers, their latest payment status, verified paid totals, pending/available/requested/paid commission balances and withdrawal history.

## 6. Manual referral withdrawals

The customer requests a withdrawal against their saved M-Pesa phone number. The minimum withdrawal amount is configurable in Admin → Payments & Daraja; `0` means no minimum. The system reserves the requested commission amount so it cannot be requested twice.

The owner sends the M-Pesa payment manually, then opens Admin → Payments & Daraja → Manual referral withdrawals and enters:

- The M-Pesa receipt code
- The exact M-Pesa confirmation message

Only then does the request become Paid and the customer see the receipt details. Receipt codes are unique. A pasted message is recorded as evidence; the owner must compare it with the actual M-Pesa transaction record before confirming.

Email alerts are optional. Configure a Resend API key, verified sender address and notification email in the same admin section. If email is not configured or delivery fails, the withdrawal remains visible in the admin portal.

This version uses **manual payouts**. It does not initiate B2C disbursements. Safaricom's B2C product has separate business permissions and onboarding requirements; it is not required for the manual workflow.

## 7. Security and operational notes

- Customer passwords are stored as scrypt hashes.
- Member sessions use random tokens stored as SHA-256 hashes in PostgreSQL and HttpOnly cookies.
- Customer device binding uses a separate HttpOnly cookie; clearing browser cookies can require an owner reset.
- Owner actions require the admin session and same-origin checks.
- Daraja secrets and optional Resend API keys are encrypted at rest.
- Payment activation is not based on a browser success message; it requires the server callback and Daraja status query.
- Payment and withdrawal history is retained in PostgreSQL.
- Rotate any credentials or passwords that have ever been pasted into chats, source files or public repositories.

## 8. Important deployment checks

Before taking live payments, test the following in Sandbox:

1. Register a new member without a referral code.
2. Register another member using the first member's referral link.
3. Complete a successful STK payment and confirm subscription activation.
4. Confirm the referring member receives the correct 10% commission.
5. Test a failed/cancelled STK request and confirm it does not activate access or create an available commission.
6. Test early renewal and confirm the expiry extends rather than resets.
7. Submit a withdrawal, reject one request, and complete another with a unique receipt and exact confirmation text.
8. Sign in from another browser/device and confirm the device restriction; test the owner reset control.
9. Confirm a member with an expired subscription cannot access Studio or spreadsheet APIs.

The code is an integration-ready implementation. Actual live payment acceptance still depends on correct Daraja credentials, shortcode/product permissions, callback reachability and Safaricom's production approval. No real payment has been tested by this source package.

## 9. Troubleshooting sign-up and sign-in

| What you see | Cause | Fix |
|---|---|---|
| "The site's database is not configured yet…" or "DATABASE_URL is not set" | `DATABASE_URL` is missing in Vercel | Vercel → Project → Settings → Environment Variables → add it for **Production** (and Preview), then **Redeploy**. |
| "The server could not reach the database" | Wrong connection string, or the database is paused/blocked | Re-copy the connection string from your database provider (Neon, Supabase, etc.). Open `/api/health` — it shows the exact database error. |
| "ADMIN_SESSION_SECRET must be set…" | Secret missing or shorter than 32 characters | Set `ADMIN_SESSION_SECRET` to a random string of 32+ characters. |
| "ADMIN_EMAIL and ADMIN_PASSWORD must be configured" | Owner credentials missing | Add both variables in Vercel, then redeploy. |
| "This account is linked to another device" | Customers are locked to one browser | Owner: Admin → Users → reset device binding. |

Environment variables are only read when a deployment starts, so **always redeploy after adding or changing one**.

## 10. Uploads, branding, messaging and paid-only sections (update)

**Uploads (Vercel Blob).** Admin → Downloads → *Choose file* uploads a file from your device straight to Vercel Blob and publishes it to paid members. Logos are uploaded the same way. Setup:

1. In Vercel, open your project → **Storage** → **Create** → **Blob**, and connect it to this project. Vercel adds `BLOB_READ_WRITE_TOKEN` to the environment automatically.
2. Redeploy once after connecting it.

Limits: 2 GB per download file, 2 MB per logo image. Deleting a download in the admin removes the listing but not the stored file.

**Branding.** Admin → **Site & branding** sets the browser tab title, search description, About text, tagline, footer text and logo. The logo also becomes the browser tab icon. Changes appear on the next page load. The tagline appears in the About section; footer text is saved as a setting for use by the site footer in a future layout pass.

**Paid-only sections.** Members without an active subscription see only the Updates tab (admin news). Downloads, videos, referrals and messaging are blocked on the server as well as hidden in the dashboard.

**One-on-one messaging.** Members write in Contact admin. In Admin → **Messages**, each member's conversation is listed separately; open one and reply. The reply appears in that member's dashboard only. Email delivery of replies is not connected.

**Device binding.** The device cookie is now `SameSite=Lax` and lasts five years, so a browser that stays signed in keeps its device identity when it is opened from a link. Logging out only ends the session in that browser. If a customer is still blocked after switching browsers or clearing cookies, reset the device in Admin → Users.

**Dependency.** This update uses `@vercel/blob` for direct browser-to-Blob uploads. Run `npm install` in the project before pushing so npm resolves and writes the matching lockfile. If deploying through Vercel, use the default npm install command (not `npm ci`) for the first deployment after this dependency is added.
