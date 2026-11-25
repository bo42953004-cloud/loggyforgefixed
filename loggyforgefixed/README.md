# LOGGYFORGE

LOGGYFORGE is a Next.js 16 + React 19 + PostgreSQL application with a visual landing page, member dashboard, code studio, spreadsheet workspace and owner admin portal.

## Included in this package

- Existing LOGGYFORGE visual theme and original Studio/Spreadsheet experiences.
- Owner-only admin portal at `/admin` (sign-in at `/admin/login`) and `Ctrl+Shift+A` shortcut.
- Member registration and sign-in with hashed passwords, server-side sessions and one-device binding.
- Subscription packages: 30 days (KSh 1,000), 60 days (KSh 1,500), 90 days (KSh 2,300), editable by the owner.
- Daraja STK Push checkout with Sandbox/Production configuration in the admin portal.
- Server callback handling and Daraja STK status query before automatic subscription activation.
- Early renewal extension from the current expiry date.
- Referral links and 10% commission on each verified subscription payment made by a referred member, including renewals.
- Customer referral dashboard with referred customer payment status and pending/available/requested/paid balances.
- Manual M-Pesa referral withdrawals with saved customer phone, configurable minimum, email notification option, unique receipt code and exact confirmation message.
- Admin payment history and manual reconciliation fallback for unresolved STK payments after checking the official M-Pesa transaction record.
- PostgreSQL ownership scoping for member projects and sheets; active subscription required for Studio and spreadsheet APIs.
- Encrypted storage for Daraja credentials and optional Resend email API key.
- Reduced animation repaint work and throttled login parallax updates; existing colors are retained.

## Quick start

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and fill in PostgreSQL and owner settings.
3. Generate `APP_ENCRYPTION_KEY` with `openssl rand -base64 32`.
4. Run `npm run dev`.
5. Visit `/admin/login`, then open Admin → Payments & Daraja to configure the Sandbox integration.
6. Register a test member at `/register` and select a package at `/account/subscribe`.

Read `DEPLOY.md` for full deployment, Daraja, security and testing instructions.

## Important

The ZIP contains no live credentials. Live Daraja payments require correct business identifiers, approved production credentials/product permissions and a reachable HTTPS callback. Manual payouts are intentionally not automated through B2C in this version. No live payment has been performed from this package.
