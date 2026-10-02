# Dahab Dashboard — Agent Guide

Staff/admin dashboard for the Dahab gold marketplace. Vue 3 + TypeScript + Vuetify + Vite,
Pinia, Vue Router, TanStack Vue Query, Axios, vue-i18n, Tailwind 4. npm only.
Short stack rules: `AGENTS.md`. Design/implementation rules: `docs/01…05-*.md`.

This is a **separate repo** from `../dahab-backend` (Laravel API). It is the API's **consumer**,
never its source of truth. Platform rules: `../dahab-backend/CLAUDE.md` (Part 1 — Platform). Do not move
or copy files between the two repos.

> Installed versions come from `package.json` (currently Vuetify `^4`, Vue Router `^5`, Vite `^8`).
> Some older docs here say "Vuetify 3" / "Vue Router 4" — write code against the **installed**
> version's APIs; don't change dependency versions as part of feature work.

## Commands

```bash
npm run dev         # Vite, port 3000
npm run type-check  # vue-tsc --build --force
npm run lint        # eslint (lint:fix to auto-fix)
npm run build       # type-check + vite build
```

Run `type-check` and `lint` before calling a task done. Building does not prove visual fidelity.

## Architecture (follow it; reuse before creating)

```
UI (pages/, components/)
 ↓
composables/ (TanStack Query hooks, use*.ts)   stores/ (Pinia: auth, ui, toast, app)
 ↓
services/*.service.ts        ← one object per backend area; the ONLY place that calls the API
 ↓                             (auth + identity call the API; the rest still return src/mock/* data)
api/axios.ts (http instance, Bearer + Accept-Language) · api/endpoints.ts · api/session.ts (token)
 ↓
Backend API
```

- `src/types/` holds the TypeScript shapes the UI uses (`src/types/api.ts` = the Backend wire shapes); `src/mock/` holds mock data for screens with no Backend route yet, kept out of components.
- `src/services/errors.ts`: the UI reads `ServiceError.code`, never HTTP details. A live service must map
  the Backend's `code` into `ServiceErrorCode` (extend the union only if a Backend code truly has no match).
- Reusable UI primitives live in `src/components/ui/` (`DBtn`, `DInput`, `DModal`, `DataTable`, `StatCard`,
  `StatusTag`, `Panel`, `Pagination`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, …). Reuse them.
- Every modal is a `DModal` (or `ConfirmDialog`, built on it) — never a bare `v-dialog` (ESLint
  `vue/no-restricted-syntax` enforces it). `DModal` caps the height to the screen and scrolls its body while the
  title and actions stay in view, so don't add your own max-height/scroll wrapper inside a modal.
- Authorization: the UI gates on the Backend's **permission strings** (`src/types/staff.ts` `PERMISSIONS`,
  `usePermissions`, router guards) — never on role names.

## API-related work — the Backend is the contract

The Backend decides endpoints, params, validation, auth, permissions, response shapes, pagination,
filters, sorting, errors and field names. **Before any API-related frontend work:**

1. **Inspect the Backend** (`../dahab-backend`): `routes/api.php` → controller → `app/Http/Requests/*`
   → `app/Http/Resources/*` (+ `Actions` for behaviour and error `code`s).
2. **Inspect the contract**: the `#[OA\…]` attributes on those classes, or the generated
   `../dahab-backend/storage/api-docs/api-docs.json` (regenerate there with `composer swagger:generate`
   if it looks stale). Do not create an `openapi.yaml` here.
3. **Inspect Postman**: `../dahab-backend/postman/Dahab-Backend.postman_collection.json` (Dashboard folder)
   for a working request/response example and the auth used.
4. **Check the real request/response** field by field — names, types, nullability, enums, status codes,
   pagination envelope. Backend is `snake_case`; map to this project's types in the service layer, not in components.
5. **Then implement.** Never "assume the API returns…".

If the Backend does **not** provide what the UI needs (endpoint, field, filter, count, permission):

- Do **not** invent the field/endpoint, hard-code a substitute, or fake it in a component.
- Stop and report exactly what is missing and what Backend change is required (endpoint · field · type ·
  permission), using the impact-report shape in `../dahab-backend/CLAUDE.md`.
- Keeping a *mock* for that piece behind its service is allowed **only if the user agrees**, and it must be
  labelled as mock in the report.

When told the Backend changed, do the reverse: search this repo for the path, the fields (both `snake_case`
and the mapped `camelCase`), the enum values and the permission strings; walk `types → services (+ mock) →
composables → stores → components/pages`; report the affected files; edit only when asked.

**Current status: partly live.** Staff authentication (login, MFA verify/enrollment, refresh, `me`, logout)
Identity documents (list, detail, image, review), Staff and permissions (staff list, role and branch assignment,
roles and their permissions — Backend specs 002 and 004), Karats, Branches and hours (Backend spec 004), Gold
pricing and Commission rates (Backend spec 005), the Audit log (Backend spec 006), and the Customer file —
search, the file, suspend/reinstate, History and sign-ins (Backend spec 007), and wallets — the Wallet statement
(one customer, all customers, the Dahab wallet; export), the customer file's wallet panel and the Overview's safety
figure, "Held on open orders" and Customer wallets panel, all behind `wallet.view` (Backend spec 008), and wallet
top-up — Incoming transfers (match, hold, reject, credit by hand, receipt, export; `topup.match`) and Controls →
Receiving accounts (`topup.accounts.manage`; not in the design) (Backend spec 009), and Listings to review — the
queue with its chips, the review panel (photos, video, invoice, seller, "sent back" counters, history) and the four
decisions: approve, ask for changes, reject, take down (`listing.review`, `listing.request_changes`,
`listing.takedown`; Backend spec 010), with — since Backend spec 011 — the read-only line of buyers, the order box,
Cancel acceptance (`order.cancel`) and the Buyers in line / Accepted chips, and (Backend spec 012) Orders — groups
with counts, past deadline, search, the order with its settlement, results, money and history, and the actions the
Backend allows (`can`): receive, enter/correct a result, propose a price, change branch, extend a deadline, hand
over to the buyer or back to the seller, cancel (`order.view` and one permission per action) — Inspections (the
branch work list and the results; `order.receive` / `inspection.enter` / `order.handover` / `order.view`) and the
read-only Buy requests (`buy_request.view`; not in the design) — call
the real Backend; `src/api/endpoints.ts` lists only
routes that exist. Everything else has no Backend route yet and is still mock or a placeholder (the rest of the
Overview, sidebar badges, every other section). `docs/README.md` and `docs/03-ARCHITECTURE.md` describe the earlier
frontend-only phase and are out of date on this point. Read `docs/06-BACKEND-API-INTEGRATION.md` for what is
wired, how the client behaves (base URL, refresh, errors) and the Backend gaps before touching a service.
The API base URL comes from `VITE_API_BASE_URL` (see `.env.example`).

## UI implementation

**Primary design reference: `docs/dahab-admin-dashboard.html`** (static HTML; layouts, colours, typography,
spacing, cards, tables, forms, navigation, widgets, responsive behaviour, page structures).

Before building or changing any page/component:

1. Open the reference and find the relevant screen; understand its structure and visual details.
2. Inspect the existing implementation and the design tokens (`src/styles/tokens.scss`, `settings.scss`, `main.scss`).
3. Reuse existing components; add a new one only for genuine reuse.
4. Recreate the design with Vue + Vuetify + TypeScript in this architecture. **Do not paste the static HTML
   into Vue**, and do not fall back to generic Vuetify admin styling or invent a new visual language.
5. Do not add widgets, filters, actions, export, bulk actions or nav items the reference does not contain.
6. Check `docs/04-UI-QUALITY-CHECKLIST.md`; keep files small (no giant page components), mock data out of UI.

Workflow phases and review prompts: `docs/02-IMPLEMENTATION-WORKFLOW.md`, `docs/05-REVIEW-PROMPTS.md`.

## Do not

- Guess API fields or create endpoints/services for APIs that don't exist in the Backend.
- Touch `../dahab-backend` from a Dashboard task other than to read it; Backend changes are proposed, not made silently.
- Refactor unrelated code, change dependencies, or delete the design reference (`docs/dahab-admin-dashboard.html`).
- Commit or push unless asked.
