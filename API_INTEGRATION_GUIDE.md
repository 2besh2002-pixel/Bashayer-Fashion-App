# دليل المطوّر المبتدئ — تجهيز التطبيق لربط API لاحقاً

> الحالة الحالية: **الخادم (Middleware) غير متاح**. التطبيق يعمل بالكامل على البيانات
> التجريبية المحلية (Mock). لم يتم إرسال أي طلب حقيقي، ولم يتم تفعيل وضع API.
> هذا الدليل مبني حرفياً على الملف `API.md` (المصدر الرسمي الوحيد).

---

## الدرس 1: ما هو API؟

تخيّل أن التطبيق الذي تراه على هاتفك هو "مطعم"، والخادم (Backend) هو "المطبخ".
التطبيق لا يطبخ بنفسه؛ يرسل طلباً إلى المطبخ ويستجيب المطبخ بالبيانات.

- **API** هو مجموعة القواعد التي تحكم هذا الحديث بين التطبيق والخادم.
- التطبيق يرسل **طلب (Request)** عبر الإنترنت، مثلاً: «أعطني قائمة المنتجات».
- الخادم يرد بـ **استجابة (Response)**، مثلاً: قائمة منتجات بصيغة JSON.
- كل طلب له **مسار (Path)** مثل `/v1/store/:storeId/products`.
- `:storeId` معناه «معرّف المتجر»، ويجب أن يأتي من الداشبورد أو من Salla — لا نخترعه.

الأساسيات من `API.md`:

| البيئة | الرابط الأساسي (Base URL) |
|---|---|
| التطوير | `http://localhost:3000` |
| الإنتاج | `https://api.mokkafa.com` |

كل المسارات تبدأ بـ `/v1/store/:storeId`.

**مهم:** في وضع Mock لا يوجد أي حديث مع المطبخ أصلاً؛ التطبيق يقرأ من ملفاتك
المحلية (`src/data/products.ts`, `src/data/categories.ts`, `src/data/mock.ts`).

---

## الدرس 2: كيف تُنظّم شروحاتي داخل المشروع؟

| الملف | دوره ببساطة |
|---|---|
| `src/config/environment.ts` | «لوحة المفاتيح» التي تحدد هل نعمل بـ `mock` أم `api`، وتقرأ الرابط ومعرّف المتجر من متغيرات البيئة. الافتراضي `mock`. |
| `.env.example` | نموذج يشرح المتغيرات التي ستحتاجها لاحقاً. لا تضع كلمات سر هنا. |
| `src/api/endpoints.ts` | «دليل العناوين»: مسارات API الموثّقة فقط، دون أي مسار مخترع. |
| `src/api/client.ts` | «الموظف الذي يرسل الطلبات»: يضيف الرابط، الرؤوس (Headers)، الرمز (Token)، المهلة (Timeout)، وينظّم الأخطاء. |
| `src/api/token.ts` | يحفظ رمز العميل (JWT) في `SecureStore` بأمان، ولا يكتبه في السجلات. |
| `src/api/errors.ts` + `src/api/errorMessages.ts` | يميّز أخطاء الاتصال والمهلة وأخطاء HTTP، ويعرض رسائل آمنة ومترجمة. |
| `src/api/types.ts` | «قوالب» تُحدد شكل بيانات الخادم حسب التوثيق فقط. |
| `src/api/mappers.ts` | «المترجم»: يأخذ بيانات الخادم ويحوّلها إلى نماذج التطبيق التي تعرفها الشاشات (`Product`, `Category`, ...). |
| `src/repositories/types.ts` | «العقد»: الواجهات التي تلتزم بها كل من Mock وAPI. |
| `src/repositories/mock*.ts` | التنفيذ الحقيقي اليوم: بياناتك التجريبية + التخزين المحلي. |
| `src/repositories/api*.ts` | التنفيذ المُجهّز للمستقبل: يستدعي client ثم يمرّر النتيجة عبر mappers. |
| `src/repositories/index.ts` | «مفتاح التبديل»: يختار Mock أو API، ويتحول إلى Mock لبقية الجلسة إذا تعذّر الخادم. |
| `src/stores/*.ts` (Zustand) | «الذاكرة المؤقتة» للتطبيق: المستخدم، السلة، المفضلة، الإعدادات. |
| `src/hooks/*.ts` | «الجسر» بين الشاشة والمتجر/المستودع؛ مثلاً `useCatalogProducts`. |
| الشاشات في `app/` | تعرض البيانات فقط؛ لا تعرف من أين جاءت. |

مثال على المسار الكامل: `app/search.tsx` → `repositories.catalog.search(...)`
→ في وضع Mock يقرأ من `PRODUCTS`، وفي وضع API يستدعي
`GET /products?search=...` ثم يعيد `Product[]` بعد الترجمة.

---

## الدرس 3: كيف يعمل وضع Mock الآن؟

1. لا يوجد ملف `.env` في المشروع — وهذا مقصود.
2. `readEnvironment({})` تُرجع `dataSource: "mock"` لأن القيمة الافتراضية هي `mock`.
3. `src/repositories/index.ts` يختار `mockSet`، لذلك `repositories.catalog` يشير إلى
   `mockCatalogRepository` و`repositories.auth` إلى `mockAuthRepository`.
4. لا يُستدعى `fetch` إطلاقاً. حتى لو كان الخادم مغلقاً، التطبيق يعمل.
5. للتأكد بنفسك:

```powershell
cd "C:\Users\بشاير علي\Desktop\Bashayer_Shopping_App_UI_v1"
npm test -- --runInBand
npx tsc --noEmit
npx expo lint
```

الاختبار `tests/apiPreparation.test.ts` يثبت صراحة أن استدعاء
`repositories.catalog.listProducts()` و`repositories.cart.get()` لا يستدعي `fetch`.

إذا فُعّل API صراحةً ثم فشل الاتصال أو انتهت المهلة أو أعاد الخادم
`500/502/503/504` أو استجابة غير صالحة، يتحول التطبيق إلى بيانات Mock لبقية الجلسة.
أخطاء `400/401/403` لا تتحول إلى نجاح تجريبي؛ تبقى أخطاء إدخال أو مصادقة.
تظهر رسالة مصدر البيانات على الشاشة الرئيسية، وتوضح شاشة OTP إن كانت معاينة محلية.

---

## الدرس 4: كيف سيعمل وضع API لاحقاً؟

مسار البيانات الكامل:

```
الشاشة (app/...)
   ↓  تستدعي hook أو repository
Hook / Zustand store
   ↓  يستدعي الواجهة نفسها
Repository (apiCatalogRepository مثلاً)
   ↓  يبني المسار بـ Store ID
API Client (src/api/client.ts)
   ↓  fetch + Bearer token + timeout + JSON
Middleware Backend (https://api.mokkafa.com/...)
   ↓  استجابة JSON
API Client (يتحقق من状态码 ويحوّل الأخطاء)
   ↓
Mappers (src/api/mappers.ts) → Product / Order / User
   ↓
نفس الشاشة تعرض النماذج القديمة دون تغيير
```

الرد يعود بنفس الشكل الذي كانت تتوقعه الشاشة، لذلك لا نحتاج لتعديل الشاشات.

### مسارات جاهزة (من API.md فقط)

- `GET /v1/store/:storeId/config`
- `POST /v1/store/:storeId/auth/otp/request`
- `POST /v1/store/:storeId/auth/otp/verify`
- `GET /v1/store/:storeId/categories`
- `GET /v1/store/:storeId/products?page&per_page&category_id&search`
- `GET /v1/store/:storeId/products/:productId`
- `GET /v1/store/:storeId/me` · `PUT /v1/store/:storeId/me`
- `GET /v1/store/:storeId/me/addresses` · `POST /v1/store/:storeId/me/addresses`
- `GET /v1/store/:storeId/cart`
- `POST /v1/store/:storeId/cart/items`
- `PUT /v1/store/:storeId/cart/items/:itemId`
- `DELETE /v1/store/:storeId/cart/items/:itemId`
- `DELETE /v1/store/:storeId/cart`
- `POST /v1/store/:storeId/orders`
- `GET /v1/store/:storeId/orders`
- `GET /v1/store/:storeId/orders/:orderId`

---

## الدرس 5: المصادقة (OTP و JWT)

1. **طلب الكود**: `POST .../auth/otp/request` بجسم `{"phone":"966500000000"}`.
   نُزيل علامة `+` وكل ما ليس رقماً قبل الإرسال.
2. **التحقق**: `POST .../auth/otp/verify` بجسم
   `{"phone":"966500000000","code":"1234","name":"..."}` (الاسم اختياري).
3. الخادم يعيد `token` و`customer`. نحفظ الرمز في `SecureStore` تحت المفتاح
   `naseej:customer-jwt` (مفتاح منفصل عن رمز النموذج المحلي حتى لا يُرسل بالخطأ).
4. كل طلب محمي يرسل الرأس: `Authorization: Bearer <token>`.
5. عند `401` أو `403` يمسح العميل الرمز تلقائياً ويعيد خطأً آمنًا «انتهت جلستكِ».

**ما هو مُحاكى اليوم؟** واجهة الدخول بـ ٤ أرقام، البحث عن رقم تجريبي محلي،
ويُصدر رمز تجريبي `demo-token-...`. لا توجد رسالة SMS حقيقية وهذا مكتوب صراحةً في الواجهة.

**ما هو مُجهّز فقط؟** الطلبان الحقيقيان، حفظ JWT، وإرسال Bearer. لم نختبرهما لأن الخادم غير متاح.

**تنبيه `debug_code`**: يظهر فقط مع `OTP_DEBUG=true` في بيئة التطوير. الكود لا يقرأه أبداً،
ولن يعتمد عليه التطبيق في الإنتاج.

---

## الدرس 6: المنتجات والتصنيفات

- `listCategories()` → `GET .../categories` → `mapApiCategory` → `Category`.
- `listProductsPaged({page, perPage, categoryId, search})` →
  `GET .../products?page=..&per_page=..&category_id=..&search=..` →
  `mapApiProductPage` → `ProductPage`. الحد الأقصى `per_page=100` حسب التوثيق.
- `search(query, lang)` يستخدم معامل `search` الموثّق فقط (لا يوجد معامل لغة في التوثيق).
- `getProduct(id)` → `GET .../products/:productId`؛ يقبل معرّفاً داخلياً أو Salla ID.
  عند `404` يُعاد `undefined` بدل انهيار التطبيق.

> التصفية المحلية الحالية (الألوان، المقاسات، السعر، الخصم، التصنيف الفرعي) تعمل
> داخل التطبيق على نماذج `Product`، لذلك تبقى صالحة في كلا الوضعين. لا نخترع فلاتر خادم جديدة.

---

## الدرس 7: السلة والطلبات

- السلة في الواجهة **تبقى محلية دائماً** (`useCartStore`) لأن أسعار الألوان/Mقاسات
  والمخزون محسوبة محلياً. مستودع `apiCartRepository` مُجهّز، لكنه غير موصول بالشاشات.
- عند الإضافة إلى السلة محلياً: تُحسب النسخة المختارة (لون + مقاس) ويُحفظ سعرها وصورتها.
  لاحقاً يمكن مزامنة ذلك عبر `POST .../cart/items` بجسم
  `{"productId":"...","quantity":1,"options":{"color":"...","size":"..."}}`.
- الطلب: `POST .../orders` بجسم اختياري
  `{"addressId":"...","paymentMethod":"cod","note":"..."}`.
  أضفنا حقول `addressId` و`paymentMethod` إلى الطلب المحلي حتى يصبح الجسم جاهزاً؛
  سلوك الدفع التجريبي لم يتغير. قيمة `card` لا تُرسل لأن التوثيق يذكر `cod` فقط.
- حالات الطلب الموثّقة: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`,
  `DELIVERED`, `CANCELLED`, `REFUNDED`. نُحوّلها إلى حالات الواجهة المحلية.
- `GET .../orders` و`GET .../orders/:orderId` جاهزان أيضاً.

---

## الدرس 8: ما الذي لا يوثّقه API؟

هذه نقاط مهمة يجب ألا نخترعها:

1. **تنويعات المنتج**: التوثيق يعرض `mainImage` و`images` وسعراً واحداً و`quantity`
   و`sku` فقط. لا يوجد `colors` ولا `sizes` ولا أسعار/صور/مخزون لكل لون أو مقاس.
   لذلك المنتجات القادمة من API تُحول بـ `colors: []`, `sizes: []`, `variations: []`.
   بياناتك التجريبية الغنية بالتنويعات محفوظة بالكامل وتعمل في وضع Mock.
   **الحد الفاصل موجود في `src/api/mappers.ts`** — عدّله فقط عندما يوثّق الخادم حقولاً جديدة.
2. **المفضلة / Wishlist**: لا توجد نقاط نهاية في `API.md`. تبقى المفضلة محلية
   (`useWishlistStore`) في كلا الوضعين. المزامنة تحتاج توثيقاً إضافياً من الخادم.
3. **إعدادات المتجر**: `GET .../config` موثّق، لكن التطبيق لا ينتظره عند الإقلاع؛
   التصميم المحلي في `store-configs/index.ts` يبقى هو المعتمد.
4. **تفاصيل العنوان**: لا يوجد `recipient` ولا `label`؛ نستخدم اسم العميل كالمستلم
   وقيمة محلية للتسمية (Label). لا نخترع حقول خادم.
5. **سطر الطلب**: لا يحتوي `productId` ولا صورة؛ نضع `productId: 0` وصورة فارغة
   بوضوح بدل اختراع قيمة.
6. **تفاصيل الدفع/الشحن**: لا توجد نقاط `payment-methods` أو `shipping-methods`.
7. **تسجيل بالبريد/كلمة مرور**: غير موثّق؛ فقط تدفق OTP.
8. **حقل `debug_code`**: للتطوير فقط، ولا يُستخدم إطلاقاً.

---

## الدرس 9: كيف أُفعّل الـ API لاحقاً؟ (خطوات عملية)

> لا تفعل هذا الآن. فقط عندما يخبرك فريق الخادم أن الخادم يعمل.

### الخطوة 1 — احصل على Store ID

من dashboard المتجر أو من **Salla Merchant ID** (مثال موثّق: `1799277417`،
ومعرّف داخلي مثل `cmqpkvkmj0000u6ikrke040fr`). **انسخه من المصدر الرسمي، لا تخترعه.**

### الخطوة 2 — انسخ ملف البيئة

```powershell
cd "C:\Users\بشاير علي\Desktop\Bashayer_Shopping_App_UI_v1"
Copy-Item .env.example .env
```

### الخطوة 3 — عدّل `.env`

للتطوير على نفس الجهاز والخادم يعمل على `localhost:3000`:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_STORE_ID=الرقم_الذي_حصلت_عليه_من_الداشبورد
EXPO_PUBLIC_API_TIMEOUT_MS=15000
```

للإنتاج:

```dotenv
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_API_BASE_URL=https://api.mokkafa.com
EXPO_PUBLIC_STORE_ID=الرقم_الذي_حصلت_عليه_من_الداشبورد
```

> لا تضع أي كلمة مرور أو سر في هذا الملف؛ المتغيرات التي تبدأ بـ
> `EXPO_PUBLIC_` تُضمَّن داخل التطبيق.

### الخطوة 4 — أعد تشغيل التطبيق (مهم)

```powershell
npx expo start --clear
```

يجب إعادة التشغيل؛ متغيرات البيئة تُقرأ عند البناء/الإقلاع، ولا يحدث تبديل أثناء الجلسة.

### الخطوة 5 — اختبر الاتصال

إذا كان الخادم محلياً، تحقق أولاً من أنه يستجيب (من PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/v1/store/<STORE_ID>/config"
```

ثم شغّل الفحوصات:

```powershell
npm test -- --runInBand
npx tsc --noEmit
npx expo lint
```

### الخطوة 6 — تأكد أن المنتجات من الخادم

- افتح التطبيق: الرئيسية → الأقسام → اختر قسماً.
- في وضع API لن تظهر تنويعات الألوان/المقاسات (لأن الخادم لم يوثّقها بعد)؛
  هذا سلوك متوقع وليس خطأً.
- سجّل الدخول برقم حقيقي: سيُطلب كود OTP أُرسل عبر SMS؛ أدخله (٤ أرقام).
- أضف منتجاً للسلة وجرّب الطلب بحذر — استخدم حساباً تجريبياً.

### الخطوة 7 — ارجع إلى Mock عند أي مشكلة

لا تحتاج إلى تغيير `.env` عند انقطاع الخادم: التطبيق ينتقل تلقائياً إلى Mock
لبقية الجلسة، ويعرض تنبيهاً بأن البيانات المحلية فعّالة. لتشغيل Mock مباشرة من
البداية، اجعل `EXPO_PUBLIC_DATA_SOURCE=mock` ثم أعد تشغيل Expo.

```powershell
Copy-Item .env.example .env
# وتأكد أن السطر التالي موجود:
# EXPO_PUBLIC_DATA_SOURCE=mock
npx expo start --clear
```

أو ببساطة احذف `.env` — الافتراضي هو `mock`، ويعود كل شيء كما كان فوراً.

### استكشاف الأخطاء

| ما تراه | السبب المحتمل | الحل |
|---|---|---|
| ظهور بيانات Mock محلية | الخادم متوقف أو الرابط/المعرّف غير صحيح | يمكن متابعة الاستخدام؛ راجع الرابط ومعرّف المتجر عند الحاجة |
| «انتهت جلستكِ» | رمز JWT منتهٍ أو HTTP `401` | سجّل الدخول مجدداً؛ لا يتحول خطأ المصادقة إلى تسجيل دخول تجريبي |
| خطأ إدخال أو صلاحية | HTTP `400/403` | صحّح البيانات أو تحقق من صلاحيات المتجر |
| «الخدمة غير متاحة مؤقتاً» | HTTP `500/502/503/504` | يتحول التطبيق تلقائياً إلى Mock لبقية الجلسة |
| «طلبات كثيرة جداً» | `429` | انتظر قليلاً |
| «لم يتم العثور على العنصر» | `404` | تأكد من صحة المعرّف |

---

## ملخص تنفيذي (Final Report)

### 1) ما الذي نُفّذ؟
لوحة تحكم مركزية لمصدر البيانات، عميل API آمن، نماذج DTO موثّقة،
دوال تحويل (mappers)، مستودعات API مُجهّزة لكلEndpoint الموثّق،
اختبارات جديدة، ودليل عربي تعليمي. لم يُرسل أي طلب حقيقي.

### 2) ملفات معدّلة
`app/checkout.tsx`, `babel.config.js`, `src/api/client.ts`, `src/api/endpoints.ts`,
`src/i18n/translations.ts`, `src/repositories/index.ts`,
`src/repositories/mockAuthRepository.ts`, `src/repositories/mockCatalogRepository.ts`,
`src/repositories/types.ts`, `src/types/index.ts`, `tests/setup.ts`.

### 3) ملفات جديدة
`.env.example`, `API_INTEGRATION_GUIDE.md`, `src/config/environment.ts`,
`src/api/{errors,errorMessages,types,mappers,token}.ts`,
`src/repositories/{apiShared,apiAuthRepository,apiCatalogRepository,apiCommerceRepositories,mockPreparedRepositories}.ts`,
`tests/{apiClient,apiMappers,apiRepositories,apiRepositorySelection}.test.ts`,
`tests/global.d.ts` (بالإضافة إلى `tests/apiPreparation.test.ts` الموجود).

### 4) مسؤولية أهم ملف — موضّحة في الدرس 2 أعلاه.

### 5) بيانات Mock محفوظة؟
نعم. لم يُحذف أي منتج أو تصنيف أو عنوان أو طلب أو مستخدم تجريبي؛
ولم يُغيّر سلوك السلة أو المفضلة أو الدفع المُحاكى.

### 6) هل يعمل بلا خادم؟
نعم. `npx expo export --platform web` نجح بدون خادم، والاختبارات تثبت عدم استدعاء `fetch` في وضع Mock.

### 7) النقاط المُجهّزة — مذكورة كاملة في الدرس 4.

### 8) غير موثّق — مذكور كاملة في الدرس 8.

### 9) نتائج الاختبارات الفعلية

| الأمر | النتيجة |
|---|---|
| `npm test -- --runInBand` | ✅ 13 suites / 105 tests passed |
| `npx tsc --noEmit` | ✅ بلا أخطاء |
| `npx expo lint` | ✅ بلا أخطاء أو تحذيرات |
| `npx expo export --platform web` | ✅ تم بناء الحزمة بدون خادم |

**لم يتم** اختبار الـ API الحقيقي لأن الخادم غير متاح — وهذا مقصود.
