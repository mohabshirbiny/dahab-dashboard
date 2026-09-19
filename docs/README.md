# Claude Dashboard Frontend Reference

## Purpose

This folder contains the rules and workflow Claude must follow when
implementing the dashboard frontend from the attached design/reference
file.

The primary objective is **high visual fidelity to the provided
design**, using Vue 3 + TypeScript + Vuetify 3, with realistic mock data
and an architecture that can later be connected to real APIs.

## Source of Truth

The attached design/reference is the primary source of truth for UI and
UX.

Do not turn the design into a generic Vuetify admin template.

Do not redesign, extend, or "improve" the product unless explicitly
requested.

When something is ambiguous, make the smallest reasonable assumption and
keep it consistent with the existing design.

## Required Stack

-   Vue 3
-   `<script setup>`
-   Composition API
-   TypeScript
-   Vite
-   Vuetify 3
-   `@mdi/font`
-   Pinia
-   `pinia-plugin-persist`
-   Vue Router 4
-   `companyMiddleware`-style route guards
-   TanStack Vue Query
-   Vue Query Devtools
-   Axios

## Current Scope

Frontend only.

Use realistic mock data.

Do not implement real backend APIs, database logic, authentication APIs,
or business integrations.

The code must be structured so mock data can later be replaced by real
APIs with minimal UI changes.

## Golden Rule

**Reference design → accurate implementation → realistic mock data →
visual review → approval → remaining pages → API-ready architecture.**
