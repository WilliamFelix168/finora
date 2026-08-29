# Phase 1 — Architecture Decisions (Security, Source-of-Truth, Precision)

Status: **decided, approved 2026-08-29**. Nothing in this document has been applied to the
codebase yet — these decisions are binding for Phase 2 onward but Phase 2 has not started.

This is the Phase 1 deliverable from `issue.md`: decide, and record, the three architecture
questions the codebase review raised, plus the account/asset/holding/transaction vocabulary Phase
1 asks for — before any investment-domain schema (Phase 2) gets designed.

---

## 1. Database access & RLS enforcement strategy

### Current state (grounded in code)

- `src/db/index.ts` opens a direct `postgres-js` connection using `DATABASE_URL`. `.env.example`
  documents this as the Supabase project's **`postgres`** role connection string (the project's
  default owner-level role) via the transaction pooler.
- `src/db/schema/*.ts` declares `.enableRLS()` and owner-scoped `pgPolicy(...)` (`auth.uid() =
  user_id`) on every table; `drizzle/0000_*.sql` contains the resulting `ALTER TABLE ... ENABLE
  ROW LEVEL SECURITY` and `CREATE POLICY` statements.
- Because Postgres RLS does not apply to a table's owning role (and the `postgres` role behaves
  as one here) by default, those policies **do not govern** the queries this app actually runs.
  The real access control today is `eq(table.userId, user.id)` written by hand into every query
  in `src/app/(dashboard)/**/actions.ts` and `page.tsx`, after `requireUser()`
  (`src/lib/auth.ts`) confirms a session.
- `@supabase/ssr` (`src/lib/supabase/{client,server}.ts`) is used **only** for Auth (sign in/up/out,
  session lookup) — the app has no code path that queries `public.*` tables through Supabase's
  PostgREST/data API, only through Drizzle.

### Options considered

**A — Keep app-layer scoping as the enforced boundary; RLS stays as declared defense-in-depth.**
No connection/role change. Every Drizzle query continues to filter by `user.id` explicitly.
- *Pros*: zero migration cost, keeps Drizzle's full query/join expressiveness (matters for
  portfolio/net-worth aggregation later), fastest to keep building on.
- *Cons*: the database itself enforces nothing against the app's own bugs — a single missed
  `.where()` is a silent cross-user data leak, discoverable only by code review or an incident.
  This is exactly the risk class the codebase review flagged.

**B — True RLS enforcement for Drizzle, via per-request Postgres role/JWT impersonation.**
Add a second, non-privileged connection path: open a transaction, run
`select set_config('request.jwt.claims', ...)` / `set local role authenticated` using the caller's
decoded Supabase JWT, run the query inside that transaction, then reset. This is a documented,
actively-used pattern in the Supabase+Drizzle ecosystem — e.g. MakerKit's `next-supabase-turbo`
Drizzle recipe ships exactly this "RLS client" alongside a separate admin/service client for
privileged operations ([makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase)),
and Drizzle's own docs describe the underlying `pgPolicy`/role primitives we're already using at
the schema level ([orm.drizzle.team/docs/rls](https://orm.drizzle.team/docs/rls)).
- *Pros*: the database becomes the actual enforcement boundary — even a buggy or future query that
  forgets a filter cannot cross a user boundary. Matches "defense in depth" for financial data.
- *Cons*: real added complexity: every request needs a JWT decode + `SET LOCAL`/`set_config` +
  transaction wrapper (can't run a bare query anymore); connection pooling needs care (`SET LOCAL`
  only holds for the transaction it's issued in — must never leak across pooled connections);
  cross-user/system-level data (e.g. a future shared asset-price table) needs its own role/policy
  design, not just "authenticated"; aggregate queries spanning many tables for net worth/portfolio
  performance (Phase 4) get harder to write and reason about under an impersonated, restricted role.

**C — Route financial reads/writes through Supabase's own client (PostgREST) instead of Drizzle.**
Use `@supabase/supabase-js` (already a dependency, already used for Auth) for the actual data
path, with Postgres functions/views for anything too complex for the client's query builder.
- *Pros*: RLS enforcement "for free," no custom session-impersonation code to build or maintain.
- *Cons*: gives up Drizzle's typed query builder and multi-table joins for the exact area (complex
  financial aggregation) where they're most valuable; pushes non-trivial logic into SQL
  functions/views maintained outside Drizzle's schema-as-code workflow — a bigger paradigm shift
  than this phase needs to force.

**D — Formalize option A with a structural safety net**, on top of whichever of A/B/C is chosen:
centralize "scoped query" access behind a small shared data-access layer (one place that always
requires and applies a `userId`), so the current pattern of copy-pasting `eq(table.userId, ...)`
across 20+ call sites stops being the thing standing between the app and a leak.

### Decision — Option A + D

**Adopted: Option A now, formalized with Option D. Option B is the recorded next step —
not applied now, not deferred indefinitely.**

Reasoning: this is a single-implementer app today with no direct client-side/PostgREST access to
financial tables and no multi-tenant exposure yet — the realistic risk right now is *developer
error* (a forgotten filter), not an untrusted external caller reaching the database directly. A
structural safety net (D) — one shared "must supply a user" query entry point instead of ad hoc
`eq()` calls everywhere — closes most of that risk immediately, cheaply, without touching the
connection model, and keeps Drizzle's full expressiveness for the portfolio/net-worth calculations
coming in Phase 2–4. RLS policies stay declared on every table (already true) as a real backstop
the moment any future code path talks to Supabase's data API directly (client-side reads,
realtime, a public API, etc.) — they are not wasted effort.

Option B should be **revisited explicitly, not silently skipped**, once any of these becomes true:
a second developer/agent is regularly writing queries without full context of this decision, the
app exposes any endpoint that isn't behind `requireUser()` + the shared data-access layer, or
compliance/trust requirements demand database-level enforcement rather than an application-layer
promise. Recording that trigger condition here means it's a deliberate future decision, not
something inherited by accident — which was the review's actual concern.

Option C is not recommended: it trades away exactly the query capability (typed joins/aggregation)
this app will lean on hardest in Phases 2–4, in exchange for a security property Option A+D already
covers adequately for the current threat model.

---

## 2. Financial value source-of-truth model

### Current state (grounded in code)

- `accounts.balance` is a stored `numeric` column that is **both**: (1) directly editable through
  `AccountForm` (`src/app/(dashboard)/accounts/account-form.tsx`) on create *and* edit, and (2)
  mutated by `applyBalanceDelta` (`src/app/(dashboard)/transactions/balance.ts`) via atomic SQL
  increments whenever a transaction is created/updated/deleted.
- There is no concept yet of "what a user holds" beyond that single cash-like number — no
  asset/instrument, no holdings, no price history.
- The review's account-delete bug is a direct symptom: `deleteAccount` removes a row with no
  reversal of the balance effects it already applied to *other* accounts, because there is no
  single authoritative recomputation path — the stored number can drift from what the transaction
  history actually implies.

### Conceptual vocabulary (for this phase — not schema)

- **Account**: a container where value is held (cash account, brokerage account, exchange account,
  wallet). An account does not "know" its own value by itself — its value is a consequence of what
  happened in it and, for anything priced (see Asset), what that's currently worth.
- **Asset / instrument**: a distinct thing a user can hold — including cash itself, treated
  consistently with crypto, fund units, and shares rather than as a special case.
- **Holding**: how much of a given asset a given account currently has. Not a fact the user states;
  a fact derived from history.
- **Investment transaction**: an event (buy, sell, dividend/income, deposit, withdrawal, transfer,
  fee) that is the actual source of truth. Everything else — holdings, balances, net worth — is a
  *view* over the transaction history (plus, for valuation, asset prices), not independently
  stored fact a user can edit directly.

### Options considered

**A — Fully derived, computed on every read.** Store only the transaction ledger; compute
holdings/balances/net worth from scratch on each request.
- *Pros*: only one writer, ever (the transaction log) — the dual-writer bug class is structurally
  impossible; every number is auditable back to an event; "corrections" are new transactions, not
  silent edits — an accounting-standard, trustworthy pattern for financial data.
- *Cons*: naive full-history recomputation gets slower as transaction history grows; harder to
  serve "current portfolio value" cheaply without some caching layer eventually.

**B — Cached balance/holdings, recomputed transactionally on every write** (continuation/hardening
of today's pattern, minus the direct-edit affordance). A stored "current" number per
account/holding, but the *only* way it changes is a transaction-processing code path — never a
form field — and every mutation (including account/category deletion, not just transaction CRUD)
is required to keep it consistent.
- *Pros*: fast reads, closest to what's already built (`applyBalanceDelta`'s pattern is reusable),
  least new machinery.
- *Cons*: correctness now depends on *every* mutation path (including deletes/cascades) being
  audited and kept in sync forever — the exact category of bug the review found; no way to
  detect/repair drift if a path is ever missed; doesn't inherently give point-in-time history
  (net worth *over time*, Phase 4) — that needs something more than "current balance" anyway.

**C — Ledger as source of truth, with a derived/rebuildable snapshot for performance and history**
(hybrid of A and B). Transactions remain the only thing a user or the app writes directly. Current
holdings/balances *and* historical points (for net worth over time, Phase 4) are maintained as
snapshots that are a **pure function of the ledger** — refreshed on write, on a schedule, or
on-demand — and can always be dropped and rebuilt from the transaction history to verify or repair
correctness.
- *Pros*: keeps A's correctness/auditability guarantee (a snapshot can always be proven right or
  wrong against the ledger) while keeping B's read performance; the "rebuild from history" property
  is a strong debugging/trust tool for a wealth-tracking app; directly reusable for Phase 4's net
  worth history and performance calculations, which need point-in-time valuations anyway — this
  isn't extra work done early, it's the same mechanism Phase 4 needs regardless.
- *Cons*: the most engineering surface of the three — needs a defined refresh strategy and a
  concrete answer for "what triggers a recompute," which is exactly the kind of decision Phase 2/3
  should make with the actual schema in hand, not this phase.

### Decision — Option C

**Adopted: transactions as the sole source of truth; balances/holdings are always derived,
snapshotted for performance, and rebuildable from history.**

This is the option that actually resolves the review's finding rather than hardening around it:
Option B is a stricter version of what's already in place and already produced the bug; Option A
is correct but Phase 4 will need snapshotting anyway, so building "derived + snapshotted" once,
rather than "purely derived" now and retrofitting caching later, is the less wasteful path.

Concretely, this means Phase 2 should **drop the directly-editable balance field** from the Account
concept: there is no form field for "what's my balance," only transactions (an "opening
balance"/initial deposit becomes an explicit transaction, not a typed-in number). This is a real,
user-visible behavior change from the current Accounts feature and is called out here deliberately
so it's decided now rather than discovered mid-Phase-2.

---

## 3. Numerical precision & rounding strategy

### Current state (grounded in code)

- Every monetary/quantity column (`accounts.balance`, `transactions.amount`, `budgets.amount`) is
  Postgres `numeric(14, 2)` mapped through Drizzle's `mode: "number"`
  (`src/db/schema/{accounts,transactions,budgets}.ts`), i.e. read/written as native JS `number`.
- `numeric(14,2)` is fine for whole-currency-unit amounts. It is not fine for investment
  quantities: BTC is commonly quoted/held to 8 decimal places, and plenty of tokens need more —
  2 decimal places cannot represent a real crypto holding at all, let alone one acquired across
  several partial fills.
- Separately from scale, `mode: "number"` means every value round-trips through IEEE‑754 double
  precision — Postgres `numeric` itself is exact at rest, but the moment it's read into a JS
  `number` (and any arithmetic is done on it in JS, as `applyBalanceDelta` does today) it inherits
  binary floating-point rounding error, which compounds across many transactions.

### Options considered

**A — Widen `numeric` scale per value class, keep `mode: "number"`.** e.g. give quantities more
decimal places, leave the JS-side mapping as-is.
- *Pros*: smallest possible change from today.
- *Cons*: only fixes the *storage* half of the problem. The JS float rounding-error issue is
  independent of column scale and remains — accumulated fee/partial-fill math still won't reconcile
  to the last decimal against what an exchange/broker reports, which undermines the app's core
  "accurate net worth" promise.

**B — Integer smallest-units per asset** (a Stripe-cents-style model: store every quantity/amount
as an integer in the asset's smallest unit, with a defined "decimals" for each asset — the same
idea ERC‑20 tokens use on-chain).
- *Pros*: exact, fast, simplest possible arithmetic (integers only), no rounding ambiguity at all.
- *Cons*: requires asset-aware scale metadata (BTC's useful precision, a stock's, a money-market
  fund's, and an arbitrary future token's are all different) — real modeling work that belongs in
  Phase 2's asset design, not this phase; a bigger structural departure from the current schema
  than B alone justifies right now.

**C — Keep Postgres `numeric` (already the right DB-level type — exact, arbitrary precision, no
float error at rest), widen scale appropriately per value class, and stop mapping to JS `number`.**
Switch the Drizzle column mode to `"string"` and perform all arithmetic through a decimal-safe
library (e.g. `decimal.js`), converting to a native number only at the final display/formatting
boundary.
- *Pros*: fixes both halves of the actual problem (scale *and* float rounding) with the smallest
  realistic delta from today's schema — same column type family, corrected scale and app-side
  handling; no new asset-level metadata required yet; a well-worn pattern (this is how most
  serious fintech apps handle Postgres `numeric` in a JS/TS codebase).
- *Cons*: marginally more code discipline than `mode: "number"` — arithmetic must go through the
  decimal library, and `<input type="number">` values need explicit parsing at the boundary
  instead of being usable as-is; one more small dependency.

### Decision — Option C

**Adopted: Option C now; Option B (asset-defined smallest-unit integers) is the recorded
escalation path for Phase 2 if the asset model needs it.**

`numeric` was never the wrong Postgres type — `numeric(14,2)`'s *scale* and the JS `number` mapping
are the actual defects, and Option C fixes exactly those without inventing new schema concepts this
phase isn't scoped to define (per-asset decimal precision belongs in Phase 2's asset modeling).
Recommend, at minimum: quantity-type columns get enough scale to represent common crypto precision
(8+ decimals) without the app being the reason a user's holdings don't reconcile with their
exchange; price/fee columns get enough scale for sub-cent/sub-satoshi pricing; and no financial
arithmetic happens in raw JS `number` anywhere in the codebase going forward. If Phase 2's asset
model turns out to need genuinely asset-specific precision (e.g. supporting arbitrary tokens where
even a generous fixed `numeric` scale becomes limiting), Option B is the documented escalation path
— not a redesign from scratch.

---

## Summary — decided

| Decision area | Decided | Deferred / revisit trigger |
|---|---|---|
| DB access & RLS | App-layer scoping (formalized via a shared, mandatory data-access helper) is the enforced boundary; RLS policies remain as declared defense-in-depth. | Revisit true RLS/JWT-impersonation enforcement if a second regular contributor, a direct/public data-API surface, or a compliance requirement appears. |
| Source of truth | Transactions are the only thing written directly; balances/holdings are always derived and snapshotted, never a form field. | Snapshot refresh strategy (on-write vs. scheduled vs. on-demand) is a Phase 2/3 decision once the transaction/holding schema exists. |
| Numerical precision | Keep Postgres `numeric`, widen scale per value class, switch Drizzle mode to `"string"` + a decimal-arithmetic library; stop doing money math in native JS `number`. | Asset-defined smallest-unit integers (Option B) if Phase 2's asset model needs precision beyond a generous fixed `numeric` scale. |

**Approved 2026-08-29.** These decisions are binding for Phase 2 (domain modeling for
Accounts/Assets/Investment Transactions) onward. Nothing in this document has been applied to the
codebase; Phase 2 has not started.
