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

Sidebar entries for Products, Search data, Customers and Orders are stubbed as "Soon".

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
  features/prescriptions/
    addform/     add-medicine-sheet.tsx
    components/  prescriptions-dashboard, prescription-detail, medicines-table, medicine-row,
                 prescription-image-card, ready-status-card, prescription-status-badge,
                 prescription-row-actions-menu
    hooks/       use-prescriptions.ts, use-product-search.ts
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

## Notes

- Legacy item format (plain int product IDs) is still read; editing a comment on one upgrades it to the object format.
- The admin check is client-side (as in Flutter). Firestore security rules should also require `isAdmin` for writes to `Prescription`.
- `lib/services/config.dart` in the Flutter app ships WooCommerce consumer key/secret inside the app bundle. They are **not** used by search and were not copied here; consider rotating them.
