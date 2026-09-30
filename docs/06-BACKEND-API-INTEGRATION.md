# Backend API Integration

How the Dashboard talks to the real Dahab Backend, what is wired, and what the Backend does not
provide yet. Read this before touching `src/api/*` or any `src/services/*`.

The Backend (`../dahab-backend`) is the source of truth. This file is a **guide and a dated
snapshot**, not the contract — when it disagrees with the Backend, the Backend wins.

## Where the real contract lives

| What | Where (in `../dahab-backend`) |
|---|---|
| Routes | `routes/api.php` (all under `/api/v1`; the Dashboard uses `/dashboard/*`) |
| Request params + validation | `app/Http/Requests/**` |
| Response shape | `app/Http/Resources/Staff/**` (+ `app/Support/ApiResponse.php`, `SessionDto.php`) |
| Error `code`s | `app/Enums/AuthErrorCode.php`, `app/Exceptions/DomainApiException.php` and the Actions that throw them |
| OpenAPI (generated) | `storage/api-docs/api-docs.json` — `composer swagger:generate` refreshes it |
| Working examples | `postman/Dahab-Backend.postman_collection.json` → **Dashboard** folder |
| Permission model | `docs/Technical Spec/dahab-dashboard-authorization.md` |

Envelope: success `{ "data": …, "meta"? }` (lists also carry Laravel's `links` and `meta`); error
`{ "message", "code", "errors"? }`.

## How it is wired

```
components/pages → composables (TanStack Query) / stores (Pinia)
                 → services/*.service.ts   maps snake_case wire types → camelCase UI types
                 → api/axios.ts (one `http` instance) → Backend /api/v1
```

- **Base URL**: `VITE_API_BASE_URL` (the API root *including* `/api/v1`). `.env.development` sets the local
  Backend; `.env.example` documents the variable. Unset, the client calls `/api/v1` on its own origin.
  The Backend must list the Dashboard's origin in `CORS_ALLOWED_ORIGINS`.
- **Paths**: `src/api/endpoints.ts` holds only routes that exist in `routes/api.php`.
- **Wire types**: `src/types/api.ts` (snake_case, exactly as sent). UI types live in `src/types/*`.
- **Session**: `src/api/session.ts`. Access token (15 min) + rotating refresh token (30 days), both in
  `localStorage`, which is read on every call (never cached in memory) so two tabs cannot replay a rotated
  refresh token — the Backend would revoke the whole session family.
- **401 handling** (`src/api/axios.ts`): one 401 on an access call → one shared `POST /dashboard/auth/refresh`
  (refresh token as Bearer) → the original request is replayed once. If the session cannot be renewed the
  session is cleared and the person is sent to login with a `redirect`. Sign-in, MFA and refresh calls set
  `skipAuthRefresh`: a 401 there is an answer, not an expiry.
- **Errors**: the response interceptor turns every failure into a `ServiceError` (`src/services/errors.ts`) whose
  `code` maps the Backend's stable `code`, falling back on the HTTP status. The UI reads `code`, never HTTP details.
  `fields` carries `422` validation messages.
- **Permissions**: UI gating reads the `permissions` array from `GET /dashboard/auth/me`. It is UX only; the
  Backend authorises every request.

## Wired to the real Backend (verified 2026-09-19 against a running Backend)

| Area | Backend route | Dashboard |
|---|---|---|
| Sign in | `POST /dashboard/auth/login` → session, **or** `mfa_required`, **or** `mfa_enrollment_required` | `staffAuthService.login`, `pages/login.vue` |
| MFA verify | `POST /dashboard/auth/mfa/verify` `{session_ref, code}` | `pages/mfa.vue` |
| MFA enrollment | `POST /dashboard/auth/mfa/enroll` `{session_ref, code}` | `pages/mfa-enroll.vue` (founders and roles flagged `requires_mfa` cannot sign in without it — Backend spec 002) |
| Refresh | `POST /dashboard/auth/refresh` | `src/api/axios.ts` interceptor |
| Current staff | `GET /dashboard/auth/me` | auth store `initialize`, permissions |
| Sign out | `POST /dashboard/auth/logout` (204) | sidebar "Sign out" |
| Identity image | `GET /dashboard/identity-documents/{id}/image?side=front\|back` (bytes, Bearer, `no-store`, every view logged) | fetched as a Blob → object URL, never cached |
| Verify / ask again / reject | `POST /dashboard/identity-documents/{id}/review` `{action: verify\|request_resubmission\|reject, reasons[], note?}` (`identity.review`); `reasons` is required for the last two | `IdentityReviewPanel`, inside the customer's file |
| Customers list | `GET /dashboard/customers?status=&per_page=&page=` (`customer.view`); `status` is `pending_verification\|active\|rejected\|suspended` | Users and verification page (`pages/users/index.vue`) |
| Customer detail | `GET /dashboard/customers/{id}` (`customer.view`); every call is audited | review panel on the same page |
| Staff list | `GET /dashboard/staff?per_page=&page=` (`staff.view`) | Staff and permissions → Staff tab (`pages/staff/index.vue`) |
| Staff roles | `PUT /dashboard/staff/{id}/roles` `{roles[], reason}` (`roles.manage`) | "Permissions" dialog (`StaffRolesModal`) |
| Permission catalogue | `GET /dashboard/permissions` (`roles.manage`) | role editor |
| Roles | `GET\|POST /dashboard/roles`, `PATCH\|DELETE /dashboard/roles/{role}` (`roles.manage`); `reason` required for permission/MFA changes and delete | Roles tab (`RolesTable`, `RoleEditorModal`, `RoleDeleteModal`) — **a UI extension beyond the design reference** (approved 2026-09-26) |
| Staff branch | `PUT /dashboard/staff/{id}/branch` `{branch_id\|null, reason}` (`roles.manage`; not on yourself) | branch select in the "Permissions" dialog, sent only when it changed (Backend spec 004) |
| Karats | `GET /dashboard/karats` (`reference.view`), `POST /dashboard/karats` `{code, purity}` (`karats.create`, starts off), `POST /dashboard/karats/{code}/toggle` `{enabled}` (`karats.toggle`) | Karats page (`pages/karats/index.vue`, `AddKaratModal`) |
| Branches | `GET\|POST /dashboard/branches`, `PATCH /dashboard/branches/{id}` (`reference.view` / `branches.manage`); `hours` replaces the whole week | Branches and hours page (`pages/branches/index.vue`, `BranchEditorModal` with the week editor) |
| Closures | `GET\|POST /dashboard/branch-closures`, `DELETE /dashboard/branch-closures/{id}` (`reference.view` / `branches.manage`); `branch_id` null = every branch; `409 closure_exists`, `409 closure_in_past` | Public holidays panel on the same page (`AddClosureModal`) |
| Gold prices | `GET /dashboard/gold-prices/current`, `GET /dashboard/gold-prices`, `POST /dashboard/gold-prices/preview` (`pricing.view`); `POST /dashboard/gold-prices/manual` (`gold_price.enter`; 201 effective / 202 pending `manual_price_confirm_required`; `409 price_feed_healthy`); `POST /dashboard/gold-prices/manual/{id}/confirm` (`gold_price.confirm`; `403 confirmer_must_differ`, `409 manual_price_not_pending`) | Gold pricing page (`pages/pricing/index.vue`, `KaratPricesTable`, `ManualPricePanel`) and the Karats "Price today" column (Backend spec 005) |
| Price adjustments | `PUT /dashboard/karats/{code}/adjustments` `{buy, sell: {kind: fixed\|percent, value}, reason}` (`pricing.rates.manage`; `422 price_inverted`), `GET /dashboard/price-adjustments/history` (`pricing.view`) | `AdjustmentModal` on Gold pricing; previews come from the Backend, never computed in the UI |
| Audit log | `GET /dashboard/audit-log` (cursor pages, filters), `GET /dashboard/audit-log/{id}`, `GET /dashboard/audit-log/export` (CSV), `GET /dashboard/audit-log/categories` (`audit.view_all` or `audit.view_own`; own-only is enforced by the Backend) | Audit log page (`pages/audit/index.vue`, `AuditTable`, `AuditEntryModal`); the design's "Device" column is "Origin" (IP) because no device model or city is recorded |
| Customer file | `GET /dashboard/customers?q=` (search, any status), `GET /dashboard/customers/{id}` (the file: `documents[]`, `suspension`; one audit entry per call, so it is loaded once per opening), `POST /dashboard/customers/{id}/suspend` `{reason, note}` and `/reinstate` `{note}` (`customer.suspend`; `Idempotency-Key` from `useIdempotencyKey`; `409 customer_already_suspended` / `customer_not_suspended`), `GET /dashboard/customers/{id}/activity` (cursor pages; `customer.view` + `audit.view_all` or `audit.view_own`), `GET /dashboard/customers/{id}/sessions` (devices + open sessions) | People → Customer file (`pages/customer/index.vue` search, `pages/customers/[id].vue` file, `components/customer-file/*`); Users review panel → "Open file". The design's orders, wallet, listings, payout account, weight difference, customer type and "Full case file" are left out (no Backend routes); signed-out sessions are not listed because the Backend deletes them (they are in History) |
| Wallets | `GET /dashboard/wallets/overview` (available, held, total owed, the bank's cash, headroom, system total), `GET /dashboard/customers/{id}/wallet`, `GET /dashboard/wallet-statement` (`view=customer\|customers\|dahab`, `from`/`to` Cairo dates, `grain=each\|day\|month`, cursor pages, oldest first; the first page of a one-customer view is audited), `GET /dashboard/wallet-statement/export` (CSV, audited) — all `wallet.view` (CEO + Finance; never the COO). Money is a 4-place string, shown with `formatMoney`, never computed | Money → Wallet statement (`pages/statement/index.vue`, `components/wallet/*`; `?customer=<id>` opens one wallet), the customer file's `CustomerWalletPanel`, and on the Overview the safety figure, "Held on open orders" and `CustomerWalletsPanel` (Backend spec 008). Hidden, not zeroed, without `wallet.view`. Finding a customer on the statement page uses the customer search, which needs `customer.view` (seeded to Finance since spec 008; without it the page explains how to open a wallet from the customer file). "Dahab earned this month" is hidden until Settlement exists |
| Wallet top-up | `GET /dashboard/topups` (`status` comma list, default `pending,on_hold`; `from`/`to` Cairo dates; `q` = reference with or without `DAHAB-`, phone or name; cursor pages, newest first; `meta.totals`), `GET /dashboard/topups/export` (CSV, audited), `GET /dashboard/topups/{id}`, `GET /dashboard/topups/{id}/receipt` (decrypted image/PDF), `POST /dashboard/topups/{id}/match\|hold\|unhold\|reject` and `POST /dashboard/topups` (credit by hand) — all `topup.match` with an `Idempotency-Key`; `GET\|POST /dashboard/receiving-accounts`, `PATCH /dashboard/receiving-accounts/{id}` (`topup.accounts.manage`; GET also `topup.match`) | Money → Incoming transfers (`pages/transfers/index.vue`, `components/transfers/*`): the list, a detail dialog with the receipt, match (credits what arrived; a note when it differs from the claim; the transaction reference when the customer is suspended), hold/unhold, reject (reason told to the customer, note staff-only), and Credit by hand (needs `customer.view` too, to find the customer). Controls → Receiving accounts (`pages/receiving-accounts/index.vue`) — not in the design, a settings-like page the product owner asked for. Open transfers show `expected_amount` (≈ what arrives after the provider fee; display only) — from `notice_fee_percent`, the fee snapshot taken when the notice was filed, so a later fee change never moves it; match pre-fills that amount and a fee note, and staff still enter what really arrived. `illegal_topup_transition` (409) means someone else closed the transfer first. The sidebar badge on Incoming transfers is live: every pending or on-hold transfer (`GET /dashboard/topups?status=pending,on_hold&from=2000-01-01&per_page=1` → `meta.totals.count`, refreshed every minute and after each action; `topup.match` only) (Backend spec 009) |
| Listings | `GET /dashboard/listings` (`state`, default `in_review` oldest first, other states most recent first; cursor pages; `meta.counts` = `in_review`, `changes_requested`, `approved_today`, `rejected`, `live`), `GET /dashboard/listings/{id}` (adds `history` and the "sent back" counters), `GET /dashboard/listings/{id}/media/{media}` (the decrypted file, never cached) — any of `listing.review`, `listing.request_changes`, `listing.takedown`; `POST /dashboard/listings/{id}/approve` and `/reject` `{reason}` (`listing.review`), `/request-changes` `{message}` (`listing.request_changes`), `/takedown` `{reason}` (`listing.takedown`), each with an `Idempotency-Key`; `409 illegal_listing_transition` / `seller_suspended` / `karat_disabled` | Listings to review page (`pages/listings/index.vue`, `components/listings/*`): chips, queue table, review panel, one `DModal` per decision. The buttons follow the Backend's `can_*` flags. "Approved today" is a count, not a list, so its chip cannot be picked; a **Live** chip (not in the design) is the way to the take-down. The design's Export and listing reference number are not built (no Backend support, by decision). "As % of gold value" is computed in the page for display from `making_charge_per_g` and `gold_rate_per_gram`. The sidebar badge is `meta.counts.in_review`. |
| Settings | `GET /dashboard/settings`, `GET /dashboard/settings/history` (`pricing.view`); `PATCH /dashboard/settings/{key}` `{value, reason}` (`pricing.rates.manage` for rates keys, `settings.manage` for operations keys) | Commission rates page (`pages/rates/index.vue`, `ReasonModal`); an "Other rules" panel lists the settings the design has no place for |

Staff roles are Backend data (spec 002): the profile's `role` field is deprecated, the UI shows `roles_detail`.
The Backend refuses self-escalation (`escalation_denied`); the UI locks the same choices ahead of time.
Not surfaced: "Create an account" and "Freeze" from the design — the Backend has no routes yet. ("Suspend" lives
in the Customer file since Backend spec 007.)
Reference data (spec 004): the design's "Price today", "Pieces listed", "In progress" and "Average time to a
result" columns need pricing, listings and orders on the Backend, so they are left out, not faked. The
branches page lists upcoming holidays only; past closures stay in the Backend. The design's note ("Thursday
4pm + 12 working hours = Sunday afternoon") is reworded to the correct example: Monday at noon.

Not surfaced in the UI: `POST /dashboard/auth/logout-all`, MFA `recovery_code` sign-in (the verify screen only
takes a 6-digit code), and a QR code on the enrollment screen (the setup key and `otpauth://` link are shown).

## Still mock, because the Backend has no route

`GET /health` is the only other real route. Everything below is **not** backed by the Backend yet:

- **Overview** (`services/overview.service.ts` → `mock/overview.ts`), except its money figures (see Wallets above):
  no dashboard/statistics endpoint.
- **Every sidebar section except Customer file, Users and verification, Staff and permissions, Gold pricing,
  Commission rates, Karats, Branches and hours, Audit log, Wallet statement, Incoming transfers, Receiving
  accounts and Listings to review** (orders, inspections, disputes, withdrawals, compensation, bank book, closing, invoices, promos,
  market maker, switches, app text, terms):
  no routes. They are placeholder pages. The Gold pricing page leaves out the design's Rapaport panel (not built).
- **Sidebar badges** other than Users and verification, Incoming transfers and Listings to review are fixed numbers in `mock/nav.ts`.
- The top bar's search and Export are UI-only toasts.

## The identity document is not a screen of its own

The identity document is the one sent with a customer's registration, so there is no Identity documents page. Staff
reach it from the customer's file on Users and verification. The Backend still exposes
`GET /dashboard/identity-documents` and `/{id}`; nothing in the Dashboard calls them.

## Gaps inside the wired Users and verification screen

`StaffCustomerVerification` is `id, display_ref, full_name, phone, email, governorate, customer_type
(ordinary|market_maker), status, suspended_reason, submitted_at, latest_document{ document_id, doc_kind, status
(pending|verified|needs_resubmission|rejected), has_back, review_reasons, review_note, created_at, reviewed_at }`.

| UI element | Missing on the Backend | Current UI |
|---|---|---|
| Market-maker **code** (design shows `MM-HODA`) | no code; promo codes are not built | type only |
| "resident", "waitlist" in the person line | no such fields | governorate and "joined …" (from `created_at`) |
| Masked phone | the phone is sent whole | shown whole. Masking is a policy decision, not made here |
| "Export all customers" | no export endpoint. Left out on purpose for now | button omitted |
| How a customer becomes a market maker | `customer_type` is `ordinary` for everyone and nothing can change it yet | shown as returned |
| Search and per-status counts | no `search` parameter, no counts endpoint | no search box; counts derived from `meta.total` (4 + 1 extra requests) |

## Keeping this file honest

Update the snapshot when an endpoint is wired or the Backend contract changes. If you find it stale, fix it or say so.
