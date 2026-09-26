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
| MFA enrollment | `POST /dashboard/auth/mfa/enroll` `{session_ref, code}` | `pages/mfa-enroll.vue` (new: roles `ceo`/`coo`/`finance` cannot sign in without it) |
| Refresh | `POST /dashboard/auth/refresh` | `src/api/axios.ts` interceptor |
| Current staff | `GET /dashboard/auth/me` | auth store `initialize`, permissions |
| Sign out | `POST /dashboard/auth/logout` (204) | sidebar "Sign out" |
| Identity image | `GET /dashboard/identity-documents/{id}/image?side=front\|back` (bytes, Bearer, `no-store`, every view logged) | fetched as a Blob → object URL, never cached |
| Verify / ask again / reject | `POST /dashboard/identity-documents/{id}/review` `{action: verify\|request_resubmission\|reject, reasons[], note?}` (`identity.review`); `reasons` is required for the last two | `IdentityReviewPanel`, inside the customer's file |
| Customers list | `GET /dashboard/customers?status=&per_page=&page=` (`customer.view`); `status` is `pending_verification\|active\|rejected\|suspended` | Users and verification page (`pages/users/index.vue`) |
| Customer detail | `GET /dashboard/customers/{id}` (`customer.view`); every call is audited | review panel on the same page |

Not surfaced in the UI: `POST /dashboard/auth/logout-all`, MFA `recovery_code` sign-in (the verify screen only
takes a 6-digit code), and a QR code on the enrollment screen (the setup key and `otpauth://` link are shown).

## Still mock, because the Backend has no route

`GET /health` is the only other real route. Everything below is **not** backed by the Backend yet:

- **Overview** (`services/overview.service.ts` → `mock/overview.ts`): no dashboard/statistics endpoint.
- **Every sidebar section except Users and verification** (listings, orders, inspections, disputes, withdrawals,
  transfers, statement, compensation, bank book, closing, invoices, pricing, rates, promos, market maker, karats,
  switches, branches, app text, terms, customer file, staff, audit): no routes. They are placeholder pages.
- **Sidebar badges** other than Users and verification are fixed numbers in `mock/nav.ts`.
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
