# Frontend Architecture Reference

Use a clean structure that keeps presentation, state, mock data, and
future API integration separated.

Suggested structure:

``` text
src/
├── api/
│   ├── axios.ts
│   └── endpoints.ts
├── assets/
├── components/
├── composables/
├── layouts/
├── mock/
│   ├── dashboard.ts
│   └── ...
├── pages/
├── plugins/
├── router/
│   ├── index.ts
│   └── guards.ts
├── stores/
├── types/
└── services/
```

The exact structure may be adapted to the existing project, but the
separation of responsibilities must be maintained.

## Components

Use reusable components where there is genuine reuse or clear
maintainability value.

Possible examples:

-   `AppLayout`
-   `AppSidebar`
-   `AppHeader`
-   `PageHeader`
-   `StatCard`
-   `DataTable`
-   `FilterSection`
-   `StatusChip`
-   `ChartCard`
-   `EmptyState`
-   `LoadingState`
-   `ConfirmDialog`

Do not create excessive abstraction.

Do not create one giant component for an entire page.

## Mock Data

Keep mock data outside large UI components.

Avoid:

``` ts
const users = [...]
```

inside a large page component.

Prefer:

``` text
mock/
  users.ts
  dashboard.ts
```

Use realistic production-like values.

Avoid meaningless placeholder content such as:

-   Lorem ipsum
-   Test User
-   Item 1
-   Item 2

## API Readiness

Create a centralized Axios instance.

Prepare the architecture for:

-   Authentication token interceptor
-   Language interceptor
-   Common error handling

Do not connect to a real backend yet.

The UI should not need major refactoring when mock services are replaced
with real API calls.

## TanStack Vue Query

Configure TanStack Vue Query and Vue Query Devtools.

Mock query functions may be used during this phase.

The future flow should be conceptually:

``` text
UI
 ↓
Composable / Query
 ↓
Service
 ↓
Axios
 ↓
API
```

For the current phase, the service/query layer may return mock data.

## Pinia

Use Pinia for client-side application state where appropriate.

Possible state areas:

-   User/session state
-   Company context
-   Language
-   UI preferences
-   Sidebar state

Use `pinia-plugin-persist` when persistence is useful.

Do not create stores for every piece of local component state.

## Router

Use Vue Router 4.

Prepare route metadata and guards for a future `companyMiddleware`-style
authorization flow.

Do not implement real authentication at this stage.

## TypeScript

Use strong typing.

Avoid unnecessary `any`.

Define interfaces/types for:

-   Dashboard statistics
-   Table rows
-   Filters
-   Status values
-   User/company context
-   API response shapes where appropriate
