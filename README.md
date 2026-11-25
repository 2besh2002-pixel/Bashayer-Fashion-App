# Bashayer Shopping App UI v1 (NASEEJ)

> **Status:** Local, data-driven Expo / React Native prototype. The application runs entirely on bundled mock data by default. A prepared API layer exists but is **not enabled by default** and has **not been tested against a live backend**.

---

## 1. Project overview

| Item | Value |
|---|---|
| Project name | `bashayer_shopping_app_ui_v1` |
| App display name | `Bashayer_Shopping_App_UI_v1` |
| Brand / white-label identity | **NASEEJ** (`store-configs/index.ts`) |
| Expo slug | `bashayer-shopping-app` |
| Version | `1.0.0` |
| Runtime version policy | `appVersion` |
| Deep-link scheme | `bashayershoppingappuiv1` |
| Entry point | `expo-router/entry` |
| Default language | Arabic (`ar`), RTL |
| Default currency | SAR (base currency for all stored prices) |
| Default data source | `mock` (no network requests) |

### Purpose

A cross-platform (iOS / Android / Web) storefront prototype for a fashion retailer. It demonstrates a complete customer journey — browse categories, search and filter products, inspect colour/size variations, manage a shopping bag and wishlist, sign in with a local phone/OTP demo flow, check out and review demo orders — while keeping a clean seam for a future Middleware/backend integration.

### Main features (implemented)

- Arabic/English UI with runtime RTL/LTR switching and persisted preference.
- Hierarchical categories (`women`, `men`, `kids`) plus legacy routes (`shoes-bags`, `dresses`, `bags`, `shoes`, `accessories`).
- Data-driven product catalogue with colours, sizes, exact colour+size variations, per-variation price/stock/SKU/images, discounts and measurements.
- Client-side search, sorting and filtering by category, subcategory, price, colour, size, stock and discount.
- Product detail screen with image gallery, colour/size selection, stock/discount display and four informational accordions.
- Persistent shopping bag with variation-aware line identity, stock clamps, colour/size changes and snapshots.
- Persistent wishlist (local device only — no wishlist API exists in `API.md`).
- Local demo phone + 4-digit OTP authentication; guest browsing and guest cart/wishlist preserved across login/logout.
- Four-step checkout (address → delivery → payment → review) that creates a **locally generated demo order**.
- Orders list and detail screens, seeded demo order, addresses, notifications, settings, size guide and support screens.
- Currency selector with five currencies; prices stored in SAR and converted at render time.
- Prepared, documented API client and repository implementations behind a single data-source switch.

### Explicitly not implemented / not verified

- No live backend is connected. The OTP email/password alternatives, server-side cart sync, server profile reads, remote store config and notifications endpoints are not wired to the UI.
- Wishlist has no backend endpoints in `API.md`; it remains local in every mode.
- The API's documented product schema has **no colour/size/variation fields**, so API-sourced products have empty variation arrays. This is intentional and verified in tests.
- Exchange rates are illustrative constants, not live rates.
- No physical-device or simulator testing was performed for this documentation task.

---

## 2. Technology stack

Versions below are read from `package.json` (SDK 58 generation).

| Area | Package | Version |
|---|---|---|
| SDK | `expo` | `~58.0.26` |
| Navigation | `expo-router` | `~58.0.32` |
| UI runtime | `react` / `react-dom` | `19.3.0` |
| Native | `react-native` | `0.88.1` |
| Web | `react-native-web` | `~0.21.4` |
| State | `zustand` | `^5.1.0` |
| Styling | `nativewind` | `^4.2.7`, `tailwindcss` `^3.4.19` |
| Animation | `react-native-reanimated` `4.7.1`, `react-native-worklets` `0.13.0` |
| Storage | `@react-native-async-storage/async-storage` `2.2.0`, `expo-secure-store` `~58.0.3` |
| Images / fonts | `expo-image` `~58.0.18`, `expo-font` `~58.0.12`, `@expo-google-fonts/*` |
| Testing | `jest` `~30.5.2`, `jest-expo` `~58.0.15`, `@testing-library/react-native` `^14.1.0` |
| Language | `typescript` `~6.0.3`, strict mode |
| Lint / format | `eslint` `^9.39.5`, `eslint-config-expo` `^58.0.4`, `prettier` `^3.10.1` |
| Declared but unused | `@tanstack/react-query` `^5.108.2` — no `useQuery`/`QueryClient` usage found in source |

Configuration files: `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `eas.json`, `.eslintrc.js` / `eslint.config.js`, `.prettierrc.json`, `global.css`, `.env.example`.

---

## 3. Prerequisites

- **Node.js** and **npm** (the repository contains `package-lock.json`; use `npm`, not Bun).
- **Expo CLI** via `npx` (no global install required).
- For device testing: Expo Go or a development build; note that third-party native modules require a development build (`eas build --profile development` or `npx expo run:android|ios`).
- For the optional API path: a reachable Middleware base URL and a real Store ID from the dashboard / Salla merchant ID.

There are no required environment variables for the default mock mode.

---

## 4. Installation and running (PowerShell)

```powershell
cd "C:\Users\بشاير علي\Desktop\Bashayer_Shopping_App_UI_v1"
npm install
npx expo start
```

Other entry points:

```powershell
npx expo start --android
npx expo start --ios
npx expo start --web
npx expo start -c          # clear Metro cache when startup behaves oddly
```

Because `android/` and `ios/` directories are not committed, native projects are generated by Expo (Continuous Native Generation). Configure native behaviour in `app.json` and config plugins, not by hand-editing native folders.

### Environment configuration

Default mode needs **no `.env` file**. The safe defaults come from `src/config/environment.ts`:

| Variable | Default | Meaning |
|---|---|---|
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` | Only the exact lowercase string `api` enables API mode. |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Documented development base URL. |
| `EXPO_PUBLIC_STORE_ID` | `""` | Must be supplied from an authoritative source when using API mode. |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `15000` | Request timeout in milliseconds. |

To prepare for API mode (only when a backend is actually available):

```powershell
Copy-Item .env.example .env
# Edit .env, then restart Expo so EXPO_PUBLIC_* values are baked in:
npx expo start -c
```

Never place secrets in `EXPO_PUBLIC_*` variables — they are bundled into the app. Customer JWTs are stored by `src/api/token.ts` in `expo-secure-store`.

---

## 5. Available scripts

| Command | Action |
|---|---|
| `npm start` | `expo start` |
| `npm run android` | `expo start --android` |
| `npm run ios` | `expo start --ios` |
| `npm run web` | `expo start --web` |
| `npm test` | `jest` (all test suites) |
| `npm run test:watch` | `jest --watch` |
| `npm run lint` | `expo lint` |
| `npm run typecheck` | `tsc --noEmit` |

Additional diagnostics used during verification:

```powershell
npx expo-doctor
npx expo export --platform web
```

Builds and OTA updates are configured through EAS (`eas.json`, project ID in `app.json`):

```powershell
npx expo login
npx eas-cli build --profile development --platform android
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform all
npx eas-cli update
```

---

## 6. Project structure overview

```
.
├── app/                      # Expo Router screens (file-based routes)
│   ├── _layout.tsx           # Root Stack, fonts, splash, RTL root wrapper
│   ├── (tabs)/_layout.tsx    # Five-tab navigator with custom BottomNav
│   ├── (tabs)/               # home, categories, wishlist, cart, account
│   ├── categories/[id].tsx   # Category listing + filters + sorting
│   ├── product/[id].tsx      # Product detail and variant selection
│   ├── order/[id].tsx        # Order detail
│   ├── checkout.tsx          # Four-step checkout
│   ├── login.tsx / register.tsx
│   └── ...                   # search, orders, addresses, settings, etc.
├── src/
│   ├── api/                  # API client, endpoints, DTOs, errors, mappers, token
│   ├── components/           # ui / layout / commerce reusable components
│   ├── config/environment.ts # Data-source and API configuration
│   ├── data/                 # Mock catalogue, categories, seed data, image helpers
│   ├── hooks/                # useTranslation, usePrice, useCartDetailed, useCatalogProducts
│   ├── i18n/translations.ts  # All user-facing copy (ar/en)
│   ├── repositories/         # Interfaces, mock implementations, prepared API implementations
│   ├── stores/               # Zustand stores (auth, cart, wishlist, settings, ui)
│   ├── theme/                # Design tokens and font resolution
│   ├── types/index.ts        # Shared domain interfaces
│   └── utils/                # Pricing, variation resolution, filtering, validation, format
├── store-configs/index.ts    # White-label store configuration and feature flags
├── assets/                   # Images, fonts, icons
├── tests/                    # Jest suites and RTL checklist
├── docs/                     # This documentation set
├── API.md                    # Backend contract reference (do not modify)
└── API_INTEGRATION_GUIDE.md   # Existing Arabic onboarding guide for API preparation
```

Detailed layer responsibilities are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 7. Testing

```powershell
npm test -- --runInBand
npm run test:watch
npm run typecheck
npm run lint
npx expo-doctor
```

**Verified in this documentation task (Windows, Node/npm, 25 Nov 2026):**

| Command | Result |
|---|---|
| `npm test -- --runInBand` | 13 suites, 120 tests passed |
| `npx tsc --noEmit` | Passed, no errors |
| `npx expo lint` | Passed (only the legacy-ESLint-config notice) |
| `npx expo-doctor` | 20/20 checks passed |

No live API tests were run. See [docs/TESTING.md](docs/TESTING.md) for coverage details and how to exercise variations, cart, mock mode and failure fallback.

---

## 8. Documentation index

| File | Purpose |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, folder responsibilities, navigation, RTL design, Mermaid architecture diagrams. |
| [docs/FEATURES.md](docs/FEATURES.md) | Every implemented feature: flow, screens, components, stores, rules and edge cases. |
| [docs/DATA_FLOW.md](docs/DATA_FLOW.md) | End-to-end data movement with Mermaid flowcharts and explanatory notes. |
| [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | Zustand stores, actions, persistence keys, subscribers, safe extension patterns. |
| [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) | Actual API architecture, documented vs unsupported endpoints, fallback behaviour. |
| [docs/TESTING.md](docs/TESTING.md) | Framework, coverage, commands, verification recipes and limitations. |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Startup, Metro, dependency, connectivity and configuration diagnosis. |
| [API.md](API.md) | Original backend contract — authoritative reference, not modified. |

---

## 9. Known limitations

1. **Mock by design.** The default build makes no network requests. API mode has never been exercised against a live server here.
2. **Variation data is local.** `API.md` documents no colours, sizes or combination-level prices/stock. API-mapped products therefore have empty `colors`, `sizes` and `variations`.
3. **Wishlist is local only.** No documented endpoints; it persists in AsyncStorage on the device.
4. **Cart is local in both modes.** The prepared `apiCartRepository` is not wired to screens; variation pricing is computed client-side.
5. **Session-wide fallback.** Once an API connectivity failure occurs, all repository calls use mock data until the app is restarted; there is no automatic retry in the same session.
6. **Demo auth is not secure.** Any 4 digits are accepted, no SMS is sent, and demo tokens are predictable. Email/password repository methods exist but the UI uses phone OTP.
7. **Orders and addresses are shared local demo data**, not per-account scoped.
8. **Currency rates are illustrative constants** and are not authoritative financial data.
9. **No device verification.** Web export, Jest, TypeScript, ESLint and Expo Doctor were verified; native-device visual/performance checks were not performed.
10. **Legacy scaffolding remains.** Files such as `components/EditScreenInfo.tsx`, `constants/Colors.ts` and the unused `app/(tabs)/two.tsx` are Expo-template leftovers; `two` is not registered in the tab navigator.
