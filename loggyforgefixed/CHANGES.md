# What changed in this update

## Files changed (replace these in your repo)
- src/db/index.ts                       (new tables for one-on-one messages)
- src/lib/member/auth.ts                (device cookie: Lax, 5 years)
- src/app/layout.tsx                    (browser title, description and icon from settings)
- src/app/page.tsx                      (logo, About section, nav link)
- src/app/login/page.tsx                (logo)
- src/app/api/member/me/route.ts        (returns access flag)
- src/app/api/content/[resource]/route.ts (downloads/videos need a subscription; contact moved)
- src/components/dashboard/DashboardClient.tsx  (paid-only tabs, messaging, logo)
- src/components/admin/AdminClient.tsx  (Site & branding tab, Messages inbox, download uploader)
- DEPLOY.md, .env.example

## Files added (new)
- src/lib/site.ts
- src/app/api/site/route.ts
- src/app/api/member/messages/route.ts
- src/app/api/admin/conversations/route.ts
- src/app/api/admin/conversations/[id]/route.ts
- src/app/api/admin/uploads/route.ts
- src/components/theme/SiteMark.tsx
- src/components/theme/SiteAbout.tsx
- src/components/member/MemberConversations.tsx
- src/components/admin/ConversationsPanel.tsx
- src/components/admin/DownloadUploader.tsx
- src/components/admin/SitePanel.tsx

## Steps on your computer
1. Make sure your local project is the one connected to GitHub (`git status` should work).
2. Copy the files above into your project folder, overwriting the old ones. Do not copy `.env` files.
3. Install the new dependency: `npm install @vercel/blob`
4. Check the project builds: `npm run typecheck` then `npm run build`
5. Commit and push:
   git add -A
   git status            (check the list is only the files above)
   git commit -m "Paid-only sections, one-on-one messages, file uploads, site branding"
   git push origin main
6. Vercel deploys automatically from the push. Watch the deployment in the Vercel dashboard.

## Settings in Vercel (one time)
- Storage → Create → Blob → connect it to the project (adds BLOB_READ_WRITE_TOKEN).
- Redeploy after connecting.

## Owner steps after deploy
- Admin → Site & branding: set the title, About text and upload the logo.
- Admin → Downloads → Choose file: upload documents from your device.
- Admin → Messages: reply to each member one-on-one.
