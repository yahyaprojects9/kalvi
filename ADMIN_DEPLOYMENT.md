# Kalvi LMS Admin Deployment (Vercel)

Admin dashboard only. It talks to **Supabase directly** (no Express backend at runtime).

## Production URL

- https://kalvi-thozhan-admin.vercel.app

## Vercel project settings

| Setting | Value |
|--------|--------|
| Root Directory | `admin-dashboard/tamil-kalvi-monitor-main/frontend` |
| Install Command | `npm install --legacy-peer-deps` |
| Build Command | `npm run build` |
| Framework | TanStack Start (Nitro `vercel` preset) |

## Required environment variables

Set in Vercel → Project → Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://dgrtixahrbesogmtwxai.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Do **not** set `VITE_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `DATABASE_URL` on the admin frontend.

## Deploy from CLI

```powershell
cd admin-dashboard\tamil-kalvi-monitor-main\frontend
npm install --legacy-peer-deps
npx vercel deploy --prod
```

## Admin login (seeded)

```text
Email: admin@kalvi.test
Password: admin123
```

## Student app

The student web app will read from the same Supabase project. Admin changes (events, announcements, content) appear there after refresh.
