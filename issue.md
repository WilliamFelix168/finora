# Finora — Project Planning (Revised)

## Revision note

This supersedes the original tracker-focused plan after a full codebase review of the initial
implementation. **This is a pivot in product direction, not a restart.** The existing foundation
(Next.js/TypeScript project, Supabase Auth, PostgreSQL + Drizzle ORM setup, Tailwind + UI
component kit, application shell, Server Action + validation patterns) is sound and is carried
forward. What changes is the financial domain built on top of it, plus three architecture
decisions the review flagged as needing to be made deliberately before that domain grows.

## Product direction (corrected)

Finora is **not** primarily an income/expense/budget tracker. Finora is a **personal wealth and
investment management application**: it helps a user understand their overall financial position
across cash and investments — crypto, money market mutual funds (RDPU), stocks, and other asset
types — in one place.

At a high level, the product is organized around these concepts:

- **Financial accounts** — where money/assets are held (cash, brokerage, exchange, wallet, etc.)
- **Assets / investment instruments** — the things a user can hold (a stock ticker, a crypto asset,
  a money market fund, cash itself)
- **Investment transactions** — the actions that change what a user holds or how much cash they have
- **Holdings / portfolio** — what a user currently owns, per account and in aggregate
- **Asset prices** — the market data needed to value holdings over time
- **Net worth** — total financial position across all accounts and asset types, over time
- **Portfolio performance and allocation** — returns, gains/losses, and how holdings are
  distributed across asset types/accounts
- **Financial history** — an auditable record of everything that happened
- **Natural-language AI interaction** — a later phase, once the above is deterministic and correct

### What to reconsider rather than carry forward automatically

The current codebase has categories, budgets, income/expense transaction types, a directly
user-editable account balance, and a spending-focused dashboard (monthly income/expense + spend
trend chart). These were reasonable for a budgeting app; they are not assumed to be part of the
investment-management direction. Each is revisited explicitly in the phases below rather than kept
by default — some concepts (e.g. a simplified "deposit/withdrawal" flow, or a lightweight
categorization idea) may resurface in a different shape if the domain modeling phase decides they
add real value; nothing is auto-carried.

## What's already reusable (keep, build on top of)

- Next.js (App Router) + TypeScript project setup, Tailwind CSS, ESLint config.
- Supabase Auth integration: sign up / login / logout, session refresh, route protection at the
  proxy layer, and the trigger-based profile-provisioning approach.
- PostgreSQL + Drizzle ORM infrastructure: client setup, migration workflow (`drizzle-kit
  generate`/`migrate`), schema-as-code conventions.
- Application shell: authenticated layout, navigation, theme (dark mode) handling, sign-out.
- Reusable UI component kit (buttons, inputs, selects, cards, badges, empty states, delete
  confirmation, form error display) — these are generic and not tracker-specific.
- Implementation patterns worth continuing: Server Actions + form state hooks for mutations,
  zod schema-per-entity validation, ownership-scoped queries, migration-driven schema changes.
- The **profiles** and **accounts** concepts as a starting point — "an account holds
  something and belongs to a user" is still the right idea. Accounts will need to be redefined
  (see Phase 2) to represent investment/cash accounts generally, not just a cash balance.

## Architecture decisions to make deliberately (from the code review)

These three items were flagged as accidental/unexamined choices in the current implementation.
Before the financial domain expands, each needs a conscious decision recorded and applied
consistently — not necessarily a full rebuild, but a documented direction.

1. **User-data security / RLS strategy.** Drizzle currently connects to Postgres with a
   privileged connection, so Supabase Row Level Security policies exist on the tables but do not
   actually govern the app's own queries — protection today is entirely manual `WHERE user_id =
   ...` filtering in application code. For financial data, this boundary should be a deliberate
   choice (continue with disciplined app-layer scoping plus RLS as defense-in-depth for any
   future direct/Supabase-client access, or move to a model where Drizzle queries actually run
   under the user's identity so RLS is the real enforcement layer) — not something inherited by
   default from how the DB connection happened to be configured.

2. **Source of truth for financial values.** An account's cash balance is currently both a
   directly user-editable field and a value mutated by transaction side effects — two writers to
   the same number. Going forward, the plan needs to explicitly define, per value: what is stored
   directly, what is derived/computed (e.g. from holdings × current price, or from a transaction
   history), and where the one authoritative write path is for anything derived. This distinction
   between "Account" (a container) and "Holdings/Assets" (what's inside it, and what it's worth)
   needs to be settled at the modeling level before schema work starts.

3. **Numerical precision for financial math.** The current `numeric(14,2)` → JS `number` mapping
   is workable for whole-currency-unit amounts but breaks down for investment quantities (e.g.
   fractional BTC, which routinely needs far more than 2 decimal places) and for prices/fees where
   rounding error compounds. The plan needs a deliberate precision/rounding strategy for
   quantities, prices, fees, and monetary totals before those fields are modeled.

The current account-delete-breaks-transfer-balances bug found in review is a symptom of writer #2
above and of the current transaction model, not a standalone defect to patch — it's expected to be
resolved as a side effect of redesigning the transaction/derived-value model in Phase 3, rather
than repaired in place in code that's likely being replaced.

## Phase 1 — Security & Financial Data Model Foundations

Decide and document the three architecture items above before any new financial schema is built.
Establish (at a planning level) the account/asset/holding/transaction vocabulary this project will
use consistently, and how "what a user owns and what it's worth" will be represented conceptually
(stored vs. derived). This phase is about making decisions and recording them, using the existing
`profiles`/`accounts` foundation as the reference point — not about writing the final schema yet.

## Phase 2 — Core Domain: Accounts, Assets, and Investment Transactions

Model, at a high level, the entities needed to represent a user's financial world:

- **Accounts**, redefined to represent any place value is held (cash account, brokerage account,
  exchange account, wallet, etc.), not just a bank/cash balance.
- **Assets / instruments** a user can hold — including distinct asset types (cash, crypto, money
  market fund/RDPU, stock, and room for others later) and however much identifying/pricing
  metadata each type needs.
- **Investment transactions** covering the real set of operations this domain needs: buy, sell,
  dividend/income, deposit, withdrawal, transfer, and fees — replacing the old
  income/expense/transfer transaction model. Decide how fees and multi-effect operations (e.g. a
  buy that debits cash and credits a holding) are represented.
- Retire or migrate the existing categories, budgets, and income/expense transaction tables in
  line with this new model (categories/budgets are not expected to carry forward as-is).

Apply the source-of-truth and precision decisions from Phase 1 here: define exactly which values
are stored per transaction/holding and which are computed from them.

## Phase 3 — Holdings, Prices, and Derived Values

- **Holdings/portfolio**: what a user currently owns, derived from investment transaction history
  (not independently editable), broken down per account and in aggregate.
- **Asset prices**: a way to track market price over time per asset, sourced however is
  appropriate for this phase (manual entry, scheduled fetch, or a later external integration —
  decide scope here, don't over-build).
- Define how account/holding "current value" and account "balance" (for cash-like accounts) are
  computed from transactions + prices, finally resolving the dual-writer problem identified in
  the review.

## Phase 4 — Net Worth, Portfolio Performance & Allocation

- **Net worth**: total financial position across all accounts/assets, and its trend over time.
- **Portfolio performance**: gains/losses, returns, using the deterministic values established in
  Phase 3.
- **Allocation**: breakdown of holdings by asset type/account.
- Replace the current spending-focused dashboard (month income/expense, spend-trend chart) with
  views appropriate to this direction — net worth over time, allocation, performance — built on
  top of the existing dashboard shell/layout rather than a new one.

## Phase 5 — Financial History & Account/Transaction Management

- CRUD and browsing for accounts and investment transactions (buy/sell/dividend/deposit/
  withdrawal/transfer/fees), reusing the existing Server Action + form + validation patterns.
- Transaction history views with filtering (by account, asset, transaction type, date range),
  building on the existing filtering pattern from the prior transactions list.
- Ensure every mutation maintains the derived-value integrity decided in Phase 3 (this is where
  the account-deletion / transfer-integrity class of bug gets solved properly, as part of the new
  model rather than patched onto the old one).

## Phase 6 — UX & Deployment Readiness

- Carry forward responsive layout, dark mode, loading/empty states, and form validation
  conventions into the new domain's screens.
- Keep environment variable documentation and README instructions current as the schema evolves.
- Re-verify the production build and core flows (auth → accounts/assets → transactions →
  portfolio/net worth) end-to-end before considering a phase done.

## Phase 7 — Natural-Language AI Interaction (later phase)

Explicitly sequenced after the deterministic financial domain (Phases 1–6) is correct and stable.
At a high level, this phase lets a user ask about their financial position/history in natural
language and get accurate answers grounded in the data model above — not before that data model
and its calculations are trustworthy. Detailed scoping of this phase is deferred.

## Non-Goals (unchanged / carried forward)

- Multi-currency support beyond what's needed to represent different asset/account currencies.
- Automatic bank/open-banking or brokerage API integration (unless explicitly scoped later).
- Multi-user collaboration on a single financial account (family/shared).
- PDF/Excel report export.

## Notes for the Implementer

- This document is intentionally high-level: no exact schema, table/column names, or folder
  structure are prescribed here. Each phase's implementer designs those details when that phase is
  picked up, using the existing codebase's conventions (Drizzle schema-as-code, Server Actions,
  zod validation, the current UI kit) as the pattern to follow.
- Do not carry forward categories/budgets/income-expense/editable-balance/spending-dashboard code
  by default — each is superseded by the phases above unless a later phase explicitly decides to
  keep a variant of it.
- Work through the phases in order: the security/precision/source-of-truth decisions in Phase 1
  are a prerequisite for everything after it, and the AI phase (Phase 7) is intentionally last.
- Prefer extending the existing reusable foundation (auth, shell, UI kit, validation, DB
  infrastructure) over introducing parallel/new versions of things that already work.
