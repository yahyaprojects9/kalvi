# KalviThozhan

Tamil Nadu Government School LMS platform for Kalvi TV videos, Samacheer notes, student dashboards, authentication, profiles, feedback, and basic LMS workflows.

## Project Structure

```txt
/student-dashboard
  /frontend          # Student app (Vite → Supabase directly at runtime)
  /backend           # Migrations, seeds, verification/import scripts only

/admin-dashboard
  /tamil-kalvi-monitor-main/frontend

README.md
```

Note: the existing frontend codebase is TanStack Start/Vite, not Next.js. The structure now keeps the requested production boundaries while preserving the current working application instead of rewriting routes and package dependencies.

## Files Moved

- Student app lives under `student-dashboard/frontend/` (Vite + TanStack Start).
- Database tooling lives under `student-dashboard/backend/supabase/`.
- Student runtime uses Supabase directly; Express in `student-dashboard/backend` is for scripts only.
- Admin app lives under `admin-dashboard/tamil-kalvi-monitor-main/frontend/`.

## Files Removed

- Duplicate local docs: `frontend/README.md`, `backend/README.md`.
- AI/generated or unused root clutter: `.lovable/`, `bun.lock`, `bunfig.toml`, `wrangler.jsonc`.
- Empty legacy folders after moves: `database/`.

## Naming Cleanup

- Frontend package renamed from `tanstack_start_ts` to `kalvi-thozhan-frontend`.
- New backend package named `kalvi-thozhan-backend`.
- Supabase imports use `@/integrations/supabase/...`.
- Global CSS import uses `src/styles.css`.
- New backend route file follows kebab-case: `health.routes.js`.

## Architecture Boundaries

- `frontend/src/components`: reusable UI and shared visual components.
- `frontend/src/features`: feature-specific UI and logic when features are extracted from routes.
- `frontend/src/integrations/supabase`: Supabase client, server client, auth middleware, and generated types.
- `frontend/src/services`: frontend API/data service wrappers.
- `frontend/src/styles`: global CSS and Tailwind styles.
- `backend/src/routes`: Express route definitions.
- `backend/src/controllers`: request handlers when API behavior grows beyond simple routes.
- `backend/src/services`: backend business logic.
- `backend/src/repositories`: Supabase/database access wrappers.
- `backend/src/config`: environment and runtime configuration.

## Commands

Frontend:

From project root:

```bash
npm install
npm run dev
```

Student frontend only (no Express at runtime):

```bash
npm run frontend:dev
```

Admin dashboard:

```bash
cd admin-dashboard/tamil-kalvi-monitor-main/frontend
npm install --legacy-peer-deps
npm run dev
```

Backend scripts (migrate/seed):

```bash
npm run db:migrate
npm run db:seed
```

## Supabase Setup

Copy `student-dashboard/backend/.env.example` to `student-dashboard/backend/.env` and keep it private. The repository `.gitignore` excludes `.env` and `.env.*` files, while allowing checked-in `.env.example` templates.

Required backend secrets:

1. `SUPABASE_URL`: Supabase Project URL.
2. `SUPABASE_ANON_KEY`: Supabase anon public key. This is useful for local checks and frontend public configuration, but it must not be used for backend admin writes.
3. `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key. Keep this backend-only. Never expose it to frontend code.
4. `DATABASE_URL` or `SUPABASE_DB_URL`: Postgres connection string for migrations. This usually includes the Supabase database password.
5. Supabase Personal Access Token: only needed for `supabase login` when using the Supabase CLI.

Required frontend public env:

```bash
cd student-dashboard/frontend
copy .env.example .env
```

Set:

- `VITE_SUPABASE_URL`: Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key.

Do not set `VITE_API_URL` in student or admin frontend env files.

Do not put the service-role key, database password, database URL, or Supabase personal access token in frontend env files.

### Applying Migrations Safely

The student problem and anonymous complaint tables are defined in:

```txt
student-dashboard/backend/supabase/migrations/20260531001000_create_student_problems.sql
student-dashboard/backend/supabase/migrations/20260531002000_create_complaints.sql
```

Do not create tables through the Supabase REST API. The service-role key is for data access from trusted backend code, not schema changes.

Option A: Supabase CLI with Personal Access Token

```bash
cd student-dashboard/backend
npm install
npx supabase login
npx supabase link --project-ref dgrtixahrbesogmtwxai
npx supabase db push
```

Option B: Direct Postgres Connection

Set `DATABASE_URL` or `SUPABASE_DB_URL` in `student-dashboard/backend/.env`, then apply the migration with the Supabase CLI or `psql`:

```bash
cd student-dashboard/backend
npx supabase db push --db-url "%DATABASE_URL%"
```

or:

```bash
psql "%DATABASE_URL%" -f supabase/migrations/20260531001000_create_student_problems.sql
psql "%DATABASE_URL%" -f supabase/migrations/20260531002000_create_complaints.sql
```

Verify the tables after migration:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'student_problems'
order by ordinal_position;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'complaints'
order by ordinal_position;
```

Backend API routes:

```txt
GET  /health
GET  /health/db
GET  /api/schools
GET  /api/materials?class=10
GET  /api/videos?class=10&subject=Science
GET  /api/events?district=Madurai
GET  /api/notifications
POST /api/feedback
POST /api/student-problems
GET  /api/student-problems
GET  /api/student-problems/:id
PATCH /api/student-problems/:id
DELETE /api/student-problems/:id
POST /api/complaints
GET  /api/complaints
GET  /api/complaints/:id
PATCH /api/complaints/:id
```

`/api/student-problems` is the trusted path for student problem submissions. The frontend must call the backend API and must not write to `student_problems` directly with Supabase.

`/api/complaints` is the trusted path for anonymous complaints. Complaint rows must never include student name, user ID, mobile number, or EMIS number. The stored location fields are district, school name, and class only.
