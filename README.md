# Finora

Personal finance tracker — accounts, categories, transactions, and monthly budgets.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- [Supabase](https://supabase.com) (Postgres + Auth)
- [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit
- Tailwind CSS v4

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com/dashboard).
2. **Copy env vars**: `cp .env.example .env.local`, then fill in from your Supabase project:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API.
   - `DATABASE_URL` — Project Settings → Database → Connection string → **Transaction pooler** (port 6543).
3. **Install dependencies**: `npm install`
4. **Run migrations** against your Supabase database:
   ```bash
   npm run db:migrate
   ```
   This creates all tables, enables Row Level Security, adds owner-scoped policies, and installs the
   `handle_new_user` trigger that provisions a `profiles` row whenever someone signs up.
5. **Start the dev server**: `npm run dev` → http://localhost:3000

## Scripts

| Command             | Purpose                                              |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`         | Start the dev server (Turbopack)                      |
| `npm run build`       | Production build                                      |
| `npm run start`       | Start the production server                           |
| `npm run lint`        | ESLint                                                 |
| `npm run db:generate`  | Generate a SQL migration from `src/db/schema`          |
| `npm run db:migrate`  | Apply pending migrations to `DATABASE_URL`             |
| `npm run db:push`     | Push schema directly without a migration (prototyping) |
| `npm run db:studio`   | Open Drizzle Studio against `DATABASE_URL`             |

## Project structure

```
src/
  app/
    (auth)/            login, signup, sign-in/up/out server actions
    (dashboard)/        authenticated app shell + feature routes
      dashboard/         summary + spending trend chart
      accounts/          CRUD
      categories/        CRUD
      transactions/       CRUD, filters, drives account balances
      budgets/            CRUD, spend-vs-budget progress
  components/
    ui/                 Tailwind-only primitives (Button, Input, Card, …)
    layout/              nav, theme toggle, sign-out
    charts/               recharts wrapper
  db/
    schema/               one file per table + relations.ts + enums.ts
    index.ts              Drizzle client (postgres-js)
  lib/
    supabase/              browser + server Supabase clients
    auth.ts                requireUser() — session check used by every action/page
    validation.ts           zod schemas
proxy.ts                  Next 16 proxy (formerly middleware): session refresh + route guard
drizzle/                  generated SQL migrations
drizzle.config.ts
```

## Security model — read before adding features

Two independent layers protect user data; **both must hold**, since Drizzle's `DATABASE_URL`
connection is a direct Postgres connection, not Supabase's PostgREST API:

1. **Row Level Security** (`drizzle/0000_*.sql`): every table has `auth.uid() = user_id` policies.
   This is the boundary that applies to Supabase's auto-generated API, Realtime, and any
   client-side `supabase-js` calls that could ever be added.
2. **Application-layer scoping**: because Drizzle queries run over `DATABASE_URL` with a role that
   owns the tables, Postgres RLS **does not apply to that connection**. Every query and mutation in
   `src/app/(dashboard)/**/actions.ts` therefore filters explicitly by
   `eq(table.userId, user.id)`, and every Server Action starts with `await requireUser()`
   (`src/lib/auth.ts`). **Never add a Drizzle query without this filter** — RLS alone will not stop
   it.

`proxy.ts` (route guard) does not cover Server Function POSTs on excluded paths, so auth is also
re-checked inside every Server Action per the [Next.js Data Security guide](https://nextjs.org/docs/app/guides/data-security).

## Money handling

- All monetary columns are `numeric(14, 2)` mapped to JS `number` (`mode: "number"`) — adequate
  precision for this app's scope; revisit with a decimal/string type if exact-precision ledger
  accounting is ever required.
- `accounts.balance` is maintained by transaction mutations (`transactions/balance.ts`), applied
  atomically via SQL increments inside a `db.transaction`, not by summing on every read.

## Non-goals (see `issue.md`)

Multi-currency, bank/open-banking integrations, shared/multi-user accounts, PDF/Excel export.
