# Features

> Every feature below is implemented in the current source. Prepared-but-unwired capabilities (server cart sync, profile API, remote store config) are explicitly marked as such rather than described as working. Cross-references: [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_FLOW.md](DATA_FLOW.md), [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md), [API_INTEGRATION.md](API_INTEGRATION.md).

## 1. Authentication (local demo phone + OTP)

1. **Purpose.** Let a customer sign in / register with a phone number and a 4-digit code; keep guest cart/wishlist data intact across auth transitions.
2. **User flow.** Login or Register screen → choose dial code → enter phone → `submitDetails()` validates and calls `loginWithPhone` / `registerWithPhone` → OTP stage (4 boxes, paste supported) → `verify()` → success stage → account tab. Unknown numbers are rejected before the OTP stage in mock mode.
3. **Main screens.** `app/login.tsx`, `app/register.tsx`, `app/(tabs)/account.tsx`.
4. **Important components.** `AppTextInput`, `Button`, `PageHeader`, `Screen`, `Icon`; OTP input refs managed locally in each screen.
5. **Hooks and stores.** `useAuthStore` (`status`, `user`, `token`, `isAuthenticated`, `initialized`, actions `loginWithPhone`, `registerWithPhone`, `requestOtp`, `verifyOtp`, `logout`, `restore`); `useTranslation`, `useUiStore` for feedback.
6. **Data source.** `repositories.auth` → `mockAuthRepository` (default) or `apiAuthRepository` (API mode). Mock users are in AsyncStorage key `naseej:users`; the seeded account is `+966500000000` / `test@naseej.com`. Demo token stored in SecureStore key `naseej:session`.
7. **Business rules.**
   - Phone validation: 7–15 digits (`isValidPhone`). OTP validation: exactly 4 digits (`isValidOtp`).
   - Mock `verifyOtp` accepts any 4 digits and issues `demo-token-<userId>`; no SMS is sent (disclosed in UI copy).
   - `logout()` clears the auth user/token but deliberately preserves cart and wishlist.
   - Session restoration runs once in `app/_layout.tsx` via `restore()`.
   - Legacy `login(email,password)` / `register(...)` repository methods still exist, but the UI no longer calls them; in API mode they return `apiUnsupportedAuth`.
8. **Edge cases.** Duplicate phone/email on registration; unknown phone on login; invalid or partial OTP; SecureStore unavailable on web (caught, in-memory session continues); API `debug_code` is never read.
9. **Related files.** `src/stores/authStore.ts`, `src/repositories/types.ts` (`PhoneRegistrationInput`), `src/repositories/mockAuthRepository.ts`, `src/repositories/apiAuthRepository.ts`, `src/utils/validation.ts`, `tests/auth.test.ts`.

## 2. Home screen

1. **Purpose.** Brand landing page with hero campaign, category shortcuts, new arrivals and language/currency/auth controls.
2. **User flow.** Open app → home renders (Arabic RTL by default) → tap category / search / notifications / language / currency / login-register / logout.
3. **Main screen.** `app/(tabs)/index.tsx`.
4. **Important components.** `HomeHeader`, `ProductGrid`/`ProductCard`, `SectionHeader`, `CurrencySheet`, `ConfirmDialog`, `Icon`, `Screen`.
5. **Hooks and stores.** `useCatalogProducts`, `useTranslation`, `useAuthStore`, `useSettingsStore`, `useUiStore`; `getRepositorySource()` for the source notice.
6. **Data source.** Categories come from the local `MAIN_CATEGORIES` constant. Products come from `useCatalogProducts()` → repository. Hero image is a remote Unsplash URL.
7. **Business rules.** Only the first six products are shown. Loading/error states show a retry control. The source notice reflects `getRepositorySource()` at render time. Logout requires confirmation.
8. **Edge cases.** Empty/error catalogue; guest vs authenticated header actions; language toggle changes direction without reload.
9. **Related files.** `src/data/categories.ts`, `src/hooks/useCatalogProducts.ts`, `src/repositories/index.ts`, `src/components/layout/HomeHeader.tsx`, `src/i18n/translations.ts`.

## 3. Categories and category listing

1. **Purpose.** Browse the three main categories and their subcategories, then narrow the catalogue with real product data.
2. **User flow.** Categories tab (or home category strip) → tap a main category → `/categories/:id` → optionally choose a subcategory chip, sort order, colour, size, discount/stock flags and price range → tap a product.
3. **Main screens.** `app/(tabs)/categories.tsx`, `app/categories/[id].tsx`.
4. **Important components.** `PageHeader`, `AppTextInput`, `ProductGrid`, `AppText`, `Icon`, `Screen`.
5. **Hooks and stores.** `useCatalogProducts`, `useTranslation`, `useSettingsStore` (via `usePrice`/`pick`). No dedicated category store.
6. **Data source.** `MAIN_CATEGORIES` and `getProductsByRoute` from `src/data/categories.ts`; products from `useCatalogProducts()`. Filtering uses `filterProducts` from `src/utils/filterProducts.ts`.
7. **Business rules.**
   - Main routes: `women`, `men`, `kids`. Legacy routes: `shoes-bags`, `dresses`, `bags`, `shoes`, `accessories`; unknown/`all` shows the full catalogue.
   - Subcategory is stored in the `subcategory` route param as the localized label; `resolveSubcategoryByLabel` matches id or either locale.
   - Sort options: `newest` (descending id), `priceAsc` / `priceDesc` (based on `productPriceRange`), `rating`.
   - Colour+size filters are applied as an **exact pair** using `availableColorSizeCombos`.
8. **Edge cases.** A size offered only on another colour does not satisfy the filter; price filters use the product's resolvable min/max prices; an empty result shows `noResults` copy; loading/error has a retry control.
9. **Related files.** `src/utils/filterProducts.ts`, `src/utils/productVariants.ts`, `src/data/products.ts`, `tests/productFiltering.test.ts`.

## 4. Product detail, colours, sizes, pricing and stock

1. **Purpose.** Present one product with an accurate, data-driven variant selection and an add-to-cart action.
2. **User flow.** Tap a product → `/product/:id` → optional preselected `colorId`/`sizeId` from route params → choose colour (resets gallery and quantity) → choose size → adjust quantity → add to bag; optional wishlist heart, size guide, accordions and related products.
3. **Main screen.** `app/product/[id].tsx`.
4. **Important components.** `ProductImage` (with `expo-image` prefetch), `QuantityStepper`, `Button`, `ProductGrid`, `PageHeader`, `Icon`, `Screen`.
5. **Hooks and stores.** `useCatalogProducts`, `usePrice`, `useTranslation`, `useCartStore.addItem`, `useWishlistStore.toggle`, `useUiStore.showToast`.
6. **Data source.** Product objects from the repository/hook; all variant decisions come from `resolveVariation()` in `src/utils/productVariants.ts`.
7. **Business rules.**
   - Price priority: exact variation → size override → colour price → product base price. Original price uses the same cascade; discount percent comes from configured `discount.percent` or is computed from `compareAt`.
   - Stock priority: variation → size → colour; `null` means unknown, `0` means confirmed out of stock.
   - Availability requires: selectable colour, valid size, a selection when multiple sizes exist, and no unavailable/zero-stock combination.
   - Multi-size products require a size choice; one-size products (≤1 size) resolve automatically.
   - Colour change retains the current size only if the new colour offers it (`retainAvailableSize`).
   - Images: colour-specific images first; if none, product images that are not assigned to another colour.
   - Quantity is limited to `min(10, stock ?? 10)`; snapshots of price/SKU/image/labels are stored on add.
8. **Edge cases.** Unavailable combination disables the add button and shows a specific toast (sold out / select size / unavailable); missing product shows loading, retry or `noResults`; API-sourced products have no colours/sizes so they render as option-free with base price and unknown stock.
9. **Related files.** `src/types/index.ts`, `src/utils/productVariants.ts`, `src/data/products.ts`, `tests/productVariants.test.ts`, `tests/commerce.test.ts`.

## 5. Search

1. **Purpose.** Find products by text query across both locales.
2. **User flow.** Home search bar or header → `/search` → type (search runs on every change) → results grid → product detail. Popular suggestions are shown before the first query.
3. **Main screen.** `app/search.tsx`.
4. **Important components.** `AppTextInput`, `ProductGrid`, `Icon`, `PageHeader`, `Screen`.
5. **Hooks and stores.** `useTranslation` (language is passed to the repository), local React state for query/results.
6. **Data source.** `repositories.catalog.search(query, lang)`: mock implementation filters `PRODUCTS` with token matching over name, description, slug, category and subcategory in both languages; API implementation sends only the documented `search` query parameter.
7. **Business rules.** Empty query clears results and hides the result state; all whitespace-separated tokens must match somewhere in the haystack.
8. **Edge cases.** No results message; rapid typing issues multiple requests (no debounce is implemented); API mode has no language parameter — `lang` is ignored by the API repository.
9. **Related files.** `src/repositories/mockCatalogRepository.ts`, `src/repositories/apiCatalogRepository.ts`, `tests/apiRepositories.test.ts`.

## 6. Shopping bag (cart)

1. **Purpose.** Hold variation-specific lines with stock-aware quantities and compute SAR totals.
2. **User flow.** Add from product/wishlist → cart tab → change quantity, change variant by opening the product, remove line → summary → checkout button (login dialog for guests).
3. **Main screen.** `app/(tabs)/cart.tsx`.
4. **Important components.** `ProductImage`, `QuantityStepper`, `SummaryRow`, `Button`, `AuthPromptDialog`, `EmptyState`, `Icon`.
5. **Hooks and stores.** `useCartDetailed(products)` for lines/subtotal/count; `useCartStore` actions `increment`, `decrement`, `remove`, `clear`, `addItem`, `updateVariation`; `useAuthStore.isAuthenticated`; `useUiStore`.
6. **Data source.** `useCartStore` persisted to AsyncStorage (`naseej:cart`, version 2 with migration). Product/catalogue join via `useCatalogProducts()`.
7. **Business rules.**
   - Line id = `variantLineId(productId, colorId, sizeId)` → `${productId}:${colorId ?? '-'}:${sizeId ?? '-'}`.
   - Same variant merges quantities; different colour/size combinations stay separate.
   - Quantity clamps to `MIN_QUANTITY = 1` and `MAX_QUANTITY = 10`, further capped by known stock. A line with confirmed stock `0` is removed on increment/decrement/setQuantity.
   - Each line snapshots product name, colour/size labels, SKU, unit price, image, compare-at, discount percent and stock at add time; later price changes do not silently mutate it.
   - `updateVariation` changes a line's combination, recalculates all variant data, merges into an existing identical line if present, and removes the line if the target combination is unavailable.
   - Summary shows subtotal in the selected currency; discounts show `—`, delivery shows "calculated later"; total equals subtotal.
8. **Edge cases.** Legacy persisted lines (v1) are enriched by the `migrate` function using `resolveVariation`; `lineUnitPrice` falls back to variation resolution when `unitPrice` is absent; empty cart shows an empty state; checkout requires authentication.
9. **Related files.** `src/stores/cartStore.ts`, `src/hooks/useCartDetailed.ts`, `src/utils/format.ts`, `src/utils/productVariants.ts`, `tests/commerce.test.ts`.

## 7. Wishlist

1. **Purpose.** Save products for later and add them to the bag quickly.
2. **User flow.** Tap the heart on a product card or product detail → item appears in the wishlist tab → remove or "add to list" (adds the first available colour/size combination to the cart).
3. **Main screens.** `app/(tabs)/wishlist.tsx` plus the heart controls in `ProductCard` and `app/product/[id].tsx`.
4. **Important components.** `ProductImage`, `Button`, `EmptyState`, `Icon`, `ProductCard`.
5. **Hooks and stores.** `useWishlistStore` (`ids`, `toggle`, `add`, `remove`, `has`, `merge`, `clear`), `useCartStore.addItem`, `useUiStore`, `usePrice`, `useCatalogProducts`.
6. **Data source.** Local AsyncStorage key `naseej:wishlist` (version 1). **No backend endpoints exist** for wishlist in `API.md`; it stays local in API mode too.
7. **Business rules.** A product id appears at most once; toggling removes it; the wishlist screen joins ids with the loaded catalogue so stale ids are ignored.
8. **Edge cases.** Empty state while catalogue is loading vs genuinely empty; quick-add uses `availableColorSizeCombos(p)[0]` and shows an unavailable toast if there is no valid combination.
9. **Related files.** `src/stores/wishlistStore.ts`, `src/utils/filterProducts.ts`, `tests/commerce.test.ts`.

## 8. Checkout and orders

1. **Purpose.** Four-step demonstration checkout that creates a locally generated order and lets the customer review it.
2. **User flow.** Cart → checkout (guest is prompted to log in) → Step 0 address → Step 1 delivery → Step 2 payment → Step 3 review → Place order → `/confirmation?orderId=...` → order detail. Orders tab lists all orders with all/active/completed filters.
3. **Main screens.** `app/checkout.tsx`, `app/confirmation.tsx`, `app/orders.tsx`, `app/order/[id].tsx`.
4. **Important components.** `SummaryRow`, `PageHeader`, `AuthPromptDialog`, `Button`, `AppTextInput`, `Icon`.
5. **Hooks and stores.** `useCartDetailed`, `useCartStore.clear`, `usePrice`, `useSettingsStore.currency`, `useAuthStore`; repositories `addresses.list/add` and `orders.create/list/get`.
6. **Data source.** Addresses and orders are AsyncStorage-backed (`naseej:addresses`, `naseej:orders`) with seeds from `src/data/mock.ts`; in API mode those repository calls target the documented `/me/addresses` and `/orders` endpoints.
7. **Business rules.**
   - Step 0 requires a selected address; a new address can be created inline (recipient/city/line), with `isDefault` set when it is the first address.
   - Delivery step shows standard delivery with "calculated later"; express is visually disabled. No delivery fee is computed.
   - Payment options are `card` (with unpersisted demo card fields) and `cod`. The order object records `paymentMethod`; the API repository only sends `cod` because the docs define no card value.
   - `placeOrder()` builds an `Order` with `isDemo: true`, `status: 'processing'`, `deliveryFee: 0`, `discount: 0`, `total = subtotalSar`, `currencyAtCheckout`, and an illustrative id from `demoOrderNumber()` (`NSJ-####`). It calls `repositories.orders.create(order)`, clears the cart and navigates to confirmation.
   - Confirmation shows the demo order id and status "awaiting confirmation"; its buttons open the order detail or home.
8. **Edge cases.** Guest checkout is blocked by `AuthPromptDialog`; missing address disables Continue; catalogue loading/error is handled; order detail shows a loading state until the repository responds; mapped API orders lack product ids/images and fee breakdown (mappers use honest neutral values).
9. **Related files.** `src/repositories/mockCommerceRepositories.ts`, `src/repositories/apiCommerceRepositories.ts`, `src/api/mappers.ts`, `src/types/index.ts`, `src/data/mock.ts`, `tests/commerce.test.ts`, `tests/apiRepositories.test.ts`.

## 9. Customer profile / account

1. **Purpose.** Provide a guest sign-in prompt or a signed-in profile menu with links to orders, wishlist, addresses, settings, support and logout.
2. **User flow.** Account tab → guest sees login/register buttons; signed-in user sees name/email and navigable rows → logout with confirmation.
3. **Main screen.** `app/(tabs)/account.tsx`.
4. **Important components.** `Button`, `ConfirmDialog`, `Icon`, `Screen`.
5. **Hooks and stores.** `useAuthStore` (`isAuthenticated`, `user`, `logout`), `useUiStore`, `useTranslation`.
6. **Data source.** The screen reads the **local auth user from `useAuthStore`**, not `repositories.profile`. `profileRepository` implementations are prepared but not wired to any screen.
7. **Business rules.** Logout clears auth state but keeps cart and wishlist; the avatar initial falls back to Arabic "ن".
8. **Edge cases.** Missing user fields after API login (`name`/`email` may be null) render as empty strings or the `demoUser` fallback.
9. **Related files.** `src/stores/authStore.ts`, `src/repositories/types.ts`, `src/api/mappers.ts`, `src/repositories/mockPreparedRepositories.ts`.

## 10. Addresses

1. **Purpose.** List saved addresses and add new ones for checkout.
2. **User flow.** Account → My addresses (or checkout Step 0) → view list → add new address form → save.
3. **Main screens.** `app/addresses.tsx`, embedded form in `app/checkout.tsx`.
4. **Important components.** `AppTextInput`, `Button`, `Icon`, `PageHeader`.
5. **Hooks and stores.** `useTranslation`, local React state, `repositories.addresses.list/add`.
6. **Data source.** `naseej:addresses` in AsyncStorage, seeded with one home address; in API mode, `/me/addresses`.
7. **Business rules.** All three fields (recipient, city, line) are required; the first saved address becomes default; the address label is a local-only `{ar:'المنزل', en:'Home'}` value because the API has no label field.
8. **Edge cases.** API addresses have no recipient or label — the API repository uses the profile name as recipient and a fixed local label; POST response shape is not documented, so the implementation re-lists addresses after adding.
9. **Related files.** `src/data/mock.ts`, `src/repositories/mockCommerceRepositories.ts`, `src/repositories/apiCommerceRepositories.ts`, `src/api/mappers.ts`.

## 11. Orders list, detail and notifications

1. **Purpose.** Review demo orders with status timeline and read illustrative notifications.
2. **User flow.** Account → My orders → filter all/active/completed → tap an order → detail with timeline, lines and totals. Notifications are reachable from the home bell and settings.
3. **Main screens.** `app/orders.tsx`, `app/order/[id].tsx`, `app/notifications.tsx`.
4. **Important components.** `PageHeader`, `SummaryRow`, `Icon`, `Screen`.
5. **Hooks and stores.** `useTranslation`, `usePrice`, local state; `repositories.orders.list/get`, `repositories.notifications.list`.
6. **Data source.** Seeded and locally created orders (`naseej:orders`); notifications are `SEED_NOTIFICATIONS` constants. **Notifications have no documented endpoints and are always local in both modes.**
7. **Business rules.** Active = `processing|shipped`; completed = `delivered|cancelled`. Timeline marks processing/shipped/delivered based on status; API statuses are mapped by `mapApiOrderStatus` (`REFUNDED` → `cancelled`, pending/confirmed/processing → `processing`). "Mark all read" only updates local screen state, not persistence.
8. **Edge cases.** Missing order shows a loading view indefinitely (no explicit not-found state); API orders get `productId: 0`, empty image, `deliveryFee/discount = 0` and epoch `createdAt` when fields are absent.
9. **Related files.** `src/data/mock.ts`, `src/repositories/mockCommerceRepositories.ts`, `src/api/mappers.ts`, `src/types/index.ts`.

## 12. Language, currency and other settings

1. **Purpose.** Persist language, display currency and measurement unit; navigate to account-related and support screens.
2. **User flow.** Home language pill toggles Arabic/English; currency pill opens `CurrencySheet`; Settings screen offers language, currency, personal info, address management, notification preferences, privacy/terms, return policy and contact support rows.
3. **Main screens.** `app/settings.tsx`, `src/components/commerce/CurrencySheet.tsx`, `app/(tabs)/index.tsx`, `app/size-guide.tsx`, `app/support.tsx`.
4. **Important components.** `ModalSheet`, `AppTextInput`, `Icon`, `PageHeader`.
5. **Hooks and stores.** `useSettingsStore` (`lang`, `currency`, `unit`, `setLang`, `toggleLang`, `setCurrency`, `setUnit`), `useTranslation`, `usePrice`, `useUiStore`.
6. **Data source.** AsyncStorage key `naseej:settings`; defaults from `activeStore` (`ar`, `SAR`, `cm`). Currency definitions/rates are local constants in `src/utils/currency.ts`.
7. **Business rules.** All domain prices remain SAR; conversion happens only in `formatPrice` via integer minor units. Changing currency re-renders every price through `usePrice()`. The size guide converts centimetres to inches with `(cm / 2.54).toFixed(1)`.
8. **Edge cases.** Unknown currency codes fall back to SAR in `toCurrency`; rates are illustrative and not live; settings hydration gates splash hide.
9. **Related files.** `src/stores/settingsStore.ts`, `src/utils/currency.ts`, `src/i18n/translations.ts`, `src/theme/typography.ts`, `tests/currency.test.ts`, `tests/settingsStore.test.ts`.

## 13. White-label store configuration

1. **Purpose.** Keep brand-specific identity and feature flags in one place so a second store identity can be introduced without editing screens.
2. **User flow.** Not user-facing; consumed by home header, settings defaults, mock config repository and theme tokens.
3. **Main screens.** None directly.
4. **Important components.** `HomeHeader` renders `activeStore.name` / `wordmark`.
5. **Hooks and stores.** `useSettingsStore` seeds `lang`/`currency` from `activeStore`.
6. **Data source.** `store-configs/index.ts` (`naseejStore`, `activeStore`, `storeConfigs`).
7. **Business rules.** Feature flags exist for wishlist, reviews, notifications and checkout; `homeSections` lists a future remote-config order. The documented `/config` endpoint is mapped by `apiStoreConfigRepository` but the app does **not** wait for it at startup — the local config remains authoritative.
8. **Edge cases.** Flipping a feature flag does not currently hide UI; flags are declarative only.
9. **Related files.** `src/theme/tokens.ts`, `src/repositories/mockPreparedRepositories.ts`, `src/repositories/apiCommerceRepositories.ts`, `src/types/index.ts` (`StoreConfigSnapshot`).
