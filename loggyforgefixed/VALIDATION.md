# Validation notes

Verified on the fixed package (Node 22, `npm install` with the committed `.npmrc`):

- `npm run typecheck` — passes with no errors.
- `npm run lint` — 0 errors (a few non-blocking warnings remain).
- `npm run build` — production build succeeds (this is what Vercel runs).
- End-to-end test against a real PostgreSQL: register, duplicate email, invalid referral code, session cookie,
  wrong-password login, correct login, device-binding rule, admin login and admin session — all returned the
  expected JSON responses.
- With `DATABASE_URL` missing, register/login now return a readable JSON error instead of an empty response.

Not tested: live Daraja/M-Pesa payments (needs your real Safaricom credentials and a public callback URL).
Follow the Sandbox checklist in `DEPLOY.md` before taking real payments.
