# 108Medz CRM — Next.js + shadcn/ui

Web port of the Flutter `108medz_backend` admin app. Same backend, nothing changed server-side:

| What | Backend (unchanged) |
| --- | --- |
| Login | Cloud Functions `sendMsg91Otp` → `verifyMsg91Otp` → Firebase custom token → `Users/{uid}.isAdmin` must be `true` |
| Prescriptions | Firestore `Prescription` (`isArchive == false`, ordered by `prescriptionUploadedTime desc`), customer via `UserRef` → `Users` |
| Medicine search | `janmanstore.in/wp-json/my-plugin/v1/backend-search` |

## Run

```bash
npm install
cp .env.example .env.local   # already included; edit if needed
npm run dev                  # http://localhost:3000
```

## Done so far (phase 1)

- **Auth**: WhatsApp OTP login, admin-only gate (re-checked on every session restore, not just at login), sign out, route guard with `?next=` redirect.
- **Prescriptions list** (`/prescriptions`): realtime table, status counters, search (ID / customer / mobile / label), status filter, row actions (open, view image, mark prepared/pending).
- **Prescription detail** (`/prescriptions/[id]`): customer info, ready toggle, medicines table (inline comment saves on Enter/blur, remove with confirm), add-medicine sheet (debounced search, load more, duplicate guard), image viewer with zoom + download.

## Phase 2 — Products & Customers

- **Products** (`/products`, old `/search` redirects): catalogue search by name or salt, debounced, infinite scroll, MRP / sale price / discount %, packing, click-to-copy product ID, `?q=` kept in the URL, `/` focuses search. Product search now lives in `features/products` and is reused by the prescriptions "Add medicine" sheet.
- **Customers** (`/customers`): cursor-paginated `Users` table, total count, exact phone search (tries `98…`, `+9198…`, `9198…`), joining-date range filter, CSV export by date range (up to 5000).
  - The Flutter date filter and export date range were never applied to the query — they now are (`created_time` range).
- **Customer detail** (`/customers/[id]?tab=…`, old `/customers/:id/rewards` redirects): profile header + tabs
  - **Orders** — `Orders where uid == authUid`, expandable cards (items, totals, shipping/billing)
  - **Cart** — `carts/{authUid}/items`, live qty +/-, remove, clear cart
  - **Addresses** — `Addresses where userRef in [Users/{uid} ref / string variants]` (Flutter downloaded the whole collection and filtered on the client)
  - **Rewards** — `Users/{id}/walletTransactions`, balance (same maths as Flutter), adjust points (credited / debited / pending), redeem for cash

Sidebar entries for Search data and Orders are still stubbed as "Soon".

### Firestore indexes

No new composite indexes are needed: customer queries use a single-field range + orderBy on `created_time`, and orders are sorted client-side (same as Flutter).

## Structure

```
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/layout.tsx                 # AuthGuard + DashboardShell
    (dashboard)/prescriptions/page.tsx
    (dashboard)/prescriptions/[id]/page.tsx
    api/auth/send-otp/route.ts             # proxy → sendMsg91Otp
    api/auth/verify-otp/route.ts           # proxy → verifyMsg91Otp
    api/products/search/route.ts           # proxy → WP backend-search (avoids CORS)
    globals.css  layout.tsx  page.tsx
  components/
    auth/        login-form, auth-guard
    layout/      dashboard-shell, app-sidebar, app-header, page-header, nav-config
    providers/   app-providers, auth-provider, theme-provider
    ui/          shadcn primitives
    confirm-dialog.tsx  empty-state.tsx  profile-menu.tsx  theme-toggle.tsx
  features/products/
    components/  products-dashboard, product-card, product-thumb, copy-id-button
    hooks/       use-product-search.ts
    lib/         product-mapper.ts, product-utils.ts
    repository/  products.repository.ts
    services/    products.service.ts
    types.ts
  features/customers/
    addform/     wallet-adjust-dialog.tsx
    components/  customers-dashboard, customer-detail, customer-{orders,cart,addresses,rewards}-tab,
                 customer-row-actions-menu, export-customers-dialog, wallet-balance-card, badges, avatar
    hooks/       use-customers.ts, use-customer-detail.ts
    lib/         customer-mapper.ts, customer-utils.ts
    repository/  customers.repository.ts
    services/    customers.service.ts
    types.ts
  features/prescriptions/
    addform/     add-medicine-sheet.tsx
    components/  prescriptions-dashboard, prescription-detail, medicines-table, medicine-row,
                 prescription-image-card, ready-status-card, prescription-status-badge,
                 prescription-row-actions-menu
    hooks/       use-prescriptions.ts
    lib/         prescription-mapper.ts, prescription-utils.ts
    repository/  prescriptions.repository.ts   # Firestore + API calls only
    services/    prescriptions.service.ts       # customer enrichment/cache, business rules
    types.ts
  firebase/      config.ts, collections.ts
  hooks/         use-auth.ts, use-debounce.ts
  lib/           api.ts, auth.ts, time-ago.ts, utils.ts
```

## Flutter → Next.js map

| Flutter | Next.js |
| --- | --- |
| `pages/auth/login.dart` | `components/auth/login-form.tsx` + `lib/auth.ts` |
| `nav/nav.dart` redirect | `components/auth/auth-guard.tsx` |
| `nav/shell.dart` | `components/layout/*` |
| `services/firestore.dart` (prescription parts) | `features/prescriptions/repository` + `services` |
| `models/prescriptions.dart`, `prescriptionitem.dart`, `search.dart` | `features/prescriptions/types.ts` + `lib/prescription-mapper.ts` |
| `pages/prescriptions/prescription.dart` | `components/prescriptions-dashboard.tsx` |
| `pages/prescriptions/prescriptiondetail.dart` | `components/prescription-detail.tsx` (+ children) |
| `pages/prescriptions/adddialog.dart` | `addform/add-medicine-sheet.tsx` |
| `utils/timeago.dart` | `lib/time-ago.ts` |
| `pages/searchproducts/searchproducts.dart`, `components/searchcard.dart` | `features/products/*` |
| `pages/customers/customers.dart` (+ export dialog, cart sheet) | `features/customers/components/customers-dashboard.tsx`, `export-customers-dialog.tsx`, `customer-cart-tab.tsx` |
| `pages/customers/customer_orders.dart` | `customer-orders-tab.tsx` |
| `pages/customers/customer_address.dart` | `customer-addresses-tab.tsx` |
| `pages/customers/customer_rewards_screen.dart`, `models/rewards_service.dart` | `customer-rewards-tab.tsx`, `addform/wallet-adjust-dialog.tsx` |

## Notes

- Legacy item format (plain int product IDs) is still read; editing a comment on one upgrades it to the object format.
- Wallet adjustments mirror Flutter exactly, including updating `Users.rewardPoints` for *pending* credits too.
- The old `/rewards` page (lowercase `users` collection, `rewardTransactions`) wasn't in the Flutter sidebar and looks legacy, so it wasn't ported.
- The admin check is client-side (as in Flutter). Firestore security rules should also require `isAdmin` for writes to `Prescription`.
- `lib/services/config.dart` in the Flutter app ships WooCommerce consumer key/secret inside the app bundle. They are **not** used by search and were not copied here; consider rotating them.
