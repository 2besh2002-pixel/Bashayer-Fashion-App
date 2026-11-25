# Testing

## 1. Framework and configuration

| Item | Value |
|---|---|
| Test runner | `jest` `~30.5.2` with preset `jest-expo` `~58.0.15` |
| React Native testing | `@testing-library/react-native` `^14.1.0` (used by `rtlLayout.test.tsx`) |
| Global setup | `tests/setup.ts` — mocks AsyncStorage and `expo-secure-store` for every suite |
| TypeScript types | `"types": ["jest"]` in `tsconfig.json`; `tests/global.d.ts` adds helpers |
| Transform config | `transformIgnorePatterns` in `package.json` allows Expo/NativeWind/Zustand packages to be transformed |
| Babel test hook | `babel.config.js` converts static-string `import()` to `Promise(resolve(require(...)))` only under `NODE_ENV=test` |
| Coverage collection | `src/**/*.{ts,tsx}` excluding `*.d.ts` (configured but no coverage threshold is enforced) |

`tests/setup.ts` uses an in-memory `Map` for SecureStore, so token behaviour can be asserted without a device.

## 2. Test file organization

```
tests/
├── apiClient.test.ts              # URL building, headers, token provider, HTTP errors, timeout/config
├── apiMappers.test.ts             # API → domain mapping, nullable fields, ID registry, order statuses
├── apiPreparation.test.ts         # default mock mode, no fetch in mock mode, safe mapping, error codes
├── apiRepositories.test.ts        # documented endpoints/fields only; OTP, cart, orders, config, addresses
├── apiRepositorySelection.test.ts # data-source switching and session-wide mock fallback
├── auth.test.ts                   # local demo phone/OTP login and registration rules
├── commerce.test.ts               # currency, cart variants/quantities/snapshots, wishlist, validation
├── currency.test.ts               # SAR conversion round-trip and formatting
├── dataImages.test.ts             # mapped product image constants
├── productFiltering.test.ts       # category, subcategory, price, colour, size, stock, discount filters
├── productVariants.test.ts        # price priority, images, availability, stock, SKU, catalogue sanity
├── rtlLayout.test.tsx             # shared components switch direction with language
├── settingsStore.test.ts          # Arabic default and persisted language restoration
├── setup.ts                       # global mocks
├── global.d.ts                    # type declarations
└── rtl-checklist.md               # manual/automated RTL verification checklist (not a Jest suite)
```

## 3. Commands

```powershell
cd "C:\Users\بشاير علي\Desktop\Bashayer_Shopping_App_UI_v1"

npm test -- --runInBand     # all suites, serial (recommended with mocked globals)
npm run test:watch          # watch mode
npm run typecheck           # tsc --noEmit
npm run lint                # expo lint
npx expo-doctor             # dependency/config diagnostics
```

Run one suite or one test:

```powershell
npx jest tests/commerce.test.ts --runInBand
npx jest tests/productVariants.test.ts -t "stock resolution" --runInBand
```

## 4. Verified results (this task)

Executed on Windows with Node/npm on 25 Nov 2026:

| Command | Result |
|---|---|
| `npm test -- --runInBand` | **13 suites passed, 120 tests passed**, 0 snapshots, ~19 s |
| `npx tsc --noEmit` | Passed with no errors |
| `npx expo lint` | Passed; emitted only the "Using legacy ESLint config" notice |
| `npx expo-doctor` | **20/20 checks passed**, no issues detected |

No live API requests were made. No device/simulator run was performed.

## 5. Existing coverage by area

| Area | Covered by | Examples of asserted behaviour |
|---|---|---|
| Environment / data source | `apiPreparation.test.ts`, `apiRepositorySelection.test.ts` | `mock` is default; only exact lowercase `api` opts in; documented URL/timeout defaults. |
| Network safety in mock mode | `apiPreparation.test.ts`, `apiRepositorySelection.test.ts` | `fetch` is never called by mock catalogue/cart/orders/auth. |
| API client | `apiClient.test.ts` | Encoded store path/query, Bearer header on POST/PUT/DELETE, token provider, 401/403 handler, 500/timeout/network messages, missing config, invalid JSON. |
| Error mapping | `apiClient.test.ts`, `apiPreparation.test.ts` | Documented statuses map to safe translation keys. |
| Mappers | `apiMappers.test.ts`, `apiPreparation.test.ts` | Null-safe amounts/images, sale price, pagination, remote↔local ids, address/profile/cart/order/config fallbacks, empty variation arrays. |
| Repository contracts | `apiRepositories.test.ts` | Only documented query params/paths; `debug_code` ignored; JWT saved; card omitted from order body; empty-zone guard. |
| Fallback | `apiRepositorySelection.test.ts` | Network failure, timeout, empty catalogue and missing Store ID switch to mock; cart/wishlist data survives; `getRepositorySource()` flips to `mock`. |
| Demo auth | `auth.test.ts` | Seeded phone flow, unknown phone rejection, duplicate registration, public-fields-only storage, exactly four OTP digits. |
| Variations | `productVariants.test.ts` | Price priority (combination → size → colour → base), colour-specific images, availability, stock priority, one-size, SKU generation. |
| Filtering | `productFiltering.test.ts` | Main/subcategory, price range, colour, size, exact colour+size pair, stock, discounts. |
| Cart / wishlist | `commerce.test.ts` | Variant line identity, merge vs separate lines, stock clamps, `updateVariation` recompute/merge/removal, snapshots, wishlist toggle. |
| Currency | `currency.test.ts`, `commerce.test.ts` | SAR round-trip, no double conversion, formatting. |
| Localization | `rtlLayout.test.tsx`, `settingsStore.test.ts` | Direction switching, persisted language. |
| Images | `dataImages.test.ts` | Bundled image constants non-empty and correctly mapped. |

## 6. How to test specific behaviours

### 6.1 Product variations

```powershell
npx jest tests/productVariants.test.ts --runInBand
```

The suite builds products from `src/data/products.ts` and asserts, among other things:

- exact combination price overrides size/colour/base prices;
- switching colours clears a size the new colour does not offer (`retainAvailableSize`);
- confirmed stock `0` blocks a combination, while unknown stock does not;
- colour-specific galleries never leak images assigned to another colour.

To add a case, append a `test(...)` block following the existing style, using `resolveVariation(product, colorId, sizeId)` directly (pure function, no mocks needed).

### 6.2 Cart behaviour

```powershell
npx jest tests/commerce.test.ts --runInBand
```

Tests call `useCartStore.getState().addItem(...)` and related actions, then assert on returned booleans and `getState().items`. Because `zustand/persist` uses the mocked AsyncStorage from `tests/setup.ts`, persistence does not leak across suites. Useful assertions: line ids from `variantLineId`, `MAX_QUANTITY = 10`, stock ceilings, `lineUnitPrice` fallback for legacy lines, and snapshot fields on added lines.

### 6.3 Mock mode

```powershell
npx jest tests/apiPreparation.test.ts --runInBand
npx jest tests/apiRepositorySelection.test.ts --runInBand
```

These suites spy on `globalThis.fetch`, set `configureEnvironment({ dataSource: 'mock' })` (or rely on the default), and verify that repository calls succeed without any network activity. Reset hooks (`resetEnvironment()`, `resetApiClientForTests()`, `resetRepositoryFallbackForTests()`) are called in `beforeEach`.

Manual check in the app: no `.env` file (or `EXPO_PUBLIC_DATA_SOURCE=mock`), home screen shows the local-data notice, and full colour/size selection works.

### 6.4 API failure and fallback

```powershell
npx jest tests/apiRepositorySelection.test.ts --runInBand
```

The suite uses test-only hooks to simulate API mode without a server:

```ts
configureEnvironment({ dataSource: "api", storeId: "store-1" });
configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
```

It then asserts that `repositories.catalog.listProducts()` resolves to the mock `PRODUCTS`, `getRepositorySource()` becomes `"mock"`, and local cart/wishlist data remains intact. Additional tests cover timeout, empty catalogue and missing Store ID (no request sent). HTTP 400/401/403/404/429 are deliberately **not** treated as fallback cases — see `tests/apiClient.test.ts` for their error messages.

There is no live-server integration test: no backend was available, so all API tests use a mocked `fetch`.

### 6.5 Localization

```powershell
npx jest tests/rtlLayout.test.tsx tests/settingsStore.test.ts --runInBand
```

`tests/rtl-checklist.md` records a broader web route smoke check and explicitly leaves a native-device visual pass unchecked.

## 7. Known testing limitations

1. **No live API verification.** All API tests stub `fetch`; real endpoint behaviour, CORS, TLS and token issuance are unverified.
2. **No component coverage for most screens.** Only shared layout direction has a React Native Testing Library test; screens are exercised through pure-function and store tests plus a previous web render check, not automated UI tests.
3. **No E2E / device tests.** No simulator, emulator or physical device was attached. Gestures, Reanimated frame timing, safe-area behaviour and web-vs-native indicator positioning were not measured here.
4. **Coverage is configured but not enforced.** `collectCoverageFrom` exists; there is no threshold and no committed coverage report.
5. **Legacy docs disagree about OTP length.** `IMPLEMENTATION_REPORT.md` mentions 6 digits; the actual source (`OTP_LENGTH = 4`, `isValidOtp` regex `^\d{4}$`, mock `verifyOtp`) and tests use **4**. Trust the source and `tests/auth.test.ts`.
6. **State leakage risk between custom suites.** Tests that override `globalThis.fetch` or call `configureEnvironment` must reset in `beforeEach`/`afterEach`, as the existing API suites do.
7. **`@tanstack/react-query` is unused** — no tests exist for it.
