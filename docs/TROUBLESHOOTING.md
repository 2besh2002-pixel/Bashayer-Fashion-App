# Troubleshooting

> Every command in this file is either defined in `package.json`, documented in the project's existing guides, or was executed during the verification of this documentation set. Items marked **unverified** were not executed here. The diagnosis steps describe the actual configuration sources (`app.json`, `src/config/environment.ts`, `src/api/*`, `src/repositories/index.ts`).

## 1. First, identify which layer is failing

| Symptom | Likely layer | First check |
|---|---|---|
| `expo start` will not launch / QR issues | CLI, Node, network | `npx expo-doctor`, `npx expo start -c` |
| Old code or stale assets after changes | Metro cache | `npx expo start -c` |
| Dependency version mismatch | SDK compatibility | `npx expo-doctor`, `npx expo install --fix` |
| App shows local data unexpectedly | Data-source selection / fallback | `EXPO_PUBLIC_DATA_SOURCE`, `getRepositorySource()` |
| "Session expired" / auth error | API auth (401/403) | Token in SecureStore, OTP sign-in again |
| Red error overlay with a TypeScript message | Compile time | `npm run typecheck` |
| Lint warnings/errors | Lint config | `npm run lint` |

## 2. Expo startup errors

### 2.1 Before doing anything else

```powershell
cd "C:\Users\بشاير علي\Desktop\Bashayer_Shopping_App_UI_v1"
npx expo-doctor
```

**Verified result here:** 20/20 checks passed. If it reports version conflicts, follow its suggestions, then re-run.

### 2.2 Clear Metro cache

Stale bundles are a common cause of "I changed the code but nothing happened" and of startup failures after dependency changes:

```powershell
npx expo start -c
```

`-c` is the short form; `npx expo start --clear` is used in `API_INTEGRATION_GUIDE.md`. **Unverified in this task** (no dev server was started), but both are standard Expo CLI flags and are the documented remedy in this project's files.

### 2.3 "Could not connect to server"

This message can refer to two very different servers. Identify which one first:

- **Metro / Expo dev server**: the bundler cannot be reached by Expo Go or the browser. Check that `npx expo start` is running, that the device and computer are on the same network, and try `npx expo start -c`. On web, confirm the printed URL (default port 8081) is reachable.
- **Middleware backend**: the app is in API mode and `fetch` cannot reach the configured base URL. This is not a Metro problem. See §4.

### 2.4 No `android/` or `ios/` folder

This is expected. Native projects are generated (Continuous Native Generation). Do not create or edit them; configure native behaviour in `app.json` and config plugins (`expo-router`, `expo-splash-screen`, `expo-secure-store`, `expo-asset`, `expo-image`). For a native build with custom native modules, use a development build:

```powershell
npx expo run:android
# or
npx eas-cli build --profile development --platform android
```

## 3. Dependency compatibility

The project is on Expo SDK 58 (`expo ~58.0.26`, React Native `0.88.1`, React `19.3.0`). Use Expo's installer so versions stay SDK-compatible:

```powershell
npx expo install <package>
npx expo install --fix
npx expo-doctor
```

Do not add dependencies with plain `npm install <package>` when an Expo SDK module exists. Note that `react-native-worklets` must remain listed in `babel.config.js` plugins for Reanimated 4.

A known trade-off recorded in `IMPLEMENTATION_REPORT.md`: `npm audit` reported moderate advisories in dev/test tooling; the suggested fix would downgrade Expo and was intentionally not applied. Re-run `npm audit --omit=dev --audit-level=high` if you need a current picture.

## 4. API unavailable / wrong configuration

### 4.1 Confirm the data source

`src/config/environment.ts` reads `EXPO_PUBLIC_*` at startup. Default is `mock`; only the exact lowercase word `api` enables API mode. Check `.env` (if present):

```powershell
Get-Content .env
```

Expected for API mode:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_STORE_ID=<real id from dashboard or Salla merchant id>
EXPO_PUBLIC_API_TIMEOUT_MS=15000
```

After editing `.env`, restart with a clear cache — environment variables are baked in at build/startup:

```powershell
npx expo start -c
```

### 4.2 Missing or invented Store ID

`assertApiReady()` refuses to build a request without a Store ID and `src/api/endpoints.ts` throws `"Store ID is not configured"` rather than constructing a fake path. In practice this produces a fallback to mock data with **no request sent**. Obtain the ID from the dashboard or the Salla merchant ID; do not copy one from an example.

### 4.3 Backend unreachable while in API mode

`shouldFallbackToMock()` treats network errors, timeouts, invalid JSON, missing configuration and HTTP 500/502/503/504 as infrastructure failures. The repository registry sets `connectionFailed = true`, so **all** repository calls use local mock data for the rest of the session. The home screen shows a source notice derived from `getRepositorySource()`. To retry the API, restart the app.

Check the backend from PowerShell (replace the placeholder with your real Store ID):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/v1/store/<STORE_ID>/config"
```

### 4.4 Errors that do **not** fall back

| HTTP | Meaning in this app | Action |
|---|---|---|
| 400 | Validation error | Correct the submitted data. |
| 401 / 403 | Expired/invalid token or store access | Sign in again with OTP; the client clears the JWT on 401/403. Demo sign-in does not fix a real API auth failure. |
| 404 | Item not found | `getProduct` / `getOrder` return `undefined`; UI shows a neutral state. |
| 429 | Rate limit | Wait and retry. |

Messages are safe, fixed strings mapped by `src/api/errorMessages.ts`; raw server payloads are never displayed or logged.

### 4.5 Missing `.env`

Not an error in the default configuration. Without `.env`, `readEnvironment({})` yields `dataSource: "mock"`, documented dev URL, empty Store ID and 15 s timeout. The app works fully offline. To return to mock from API mode, either delete `.env` or set `EXPO_PUBLIC_DATA_SOURCE=mock` and restart.

## 5. TypeScript errors

```powershell
npm run typecheck
```

**Verified result here:** no errors. Common causes and remedies:

| Cause | Remedy |
|---|---|
| Stale generated types after changing routes | Restart Expo; `experiments.typedRoutes` is `false`, so no typed-route generation is required. |
| `@/` alias not resolving | It is defined in `tsconfig.json` as `"@/*": ["./*"]`; keep imports inside the workspace root. |
| Missing test globals | `tsconfig.json` includes `"types": ["jest"]` and `tests/global.d.ts`. |
| ESLint/TypeScript disagreement after dependency updates | Re-run `npx expo-doctor` and `npx expo install --fix` before editing source. |

`src/types/index.ts` is the canonical domain model; when adding fields, update mappers in `src/api/mappers.ts` rather than casting in screens.

## 6. Lint and formatting

```powershell
npm run lint
npx prettier --check .
```

`npm run lint` was verified and passed; it prints a notice that the project uses a legacy ESLint config. Both `.eslintrc.js` and `eslint.config.js` exist. Do not "fix" the notice by deleting one of them without checking which one `expo lint` actually uses in your environment.

## 7. Runtime behaviour surprises (not bugs)

| Observation | Explanation |
|---|---|
| Products have no colour/size options in API mode | `API.md` documents no variation schema; `mapApiProduct` intentionally sets `colors: []`, `sizes: []`, `variations: []`. This is expected and asserted in tests. |
| Wishlist never syncs to a server | No wishlist endpoints exist in `API.md`; it is local in both modes. |
| Cart stays local even in API mode | Variation prices/stock are computed client-side; `apiCartRepository` is prepared but not wired to the UI. |
| Currency values look approximate | Rates in `src/utils/currency.ts` are illustrative constants, not live rates. |
| "Mark all read" in notifications resets after restart | Notifications have no persistence or API; the action only updates screen state. |
| A sixth tab file exists (`app/(tabs)/two.tsx`) but is not shown | It is a template leftover and is not registered in `app/(tabs)/_layout.tsx`. |

## 8. Verification checklist before declaring a fix complete

```powershell
npm test -- --runInBand
npm run typecheck
npm run lint
npx expo-doctor
```

Optionally (unverified here):

```powershell
npx expo export --platform web
npx expo start -c
```

Report any discovered application bug separately — this documentation task does not change application behaviour.
