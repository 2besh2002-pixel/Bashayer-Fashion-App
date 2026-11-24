# Salla Middleware — API Reference

> توثيق كامل لجميع endpoints المتاحة لتطبيق Expo.
> الـ Swagger التفاعلي متاح على: `http://localhost:3000/docs`

---

## Base URL

| البيئة | الرابط |
|--------|--------|
| محلي (dev) | `http://localhost:3000` |
| إنتاج | `https://api.mokkafa.com` |

---

## Store ID

كل المسارات تبدأ بـ `/v1/store/:storeId`.

الـ `storeId` يقبل إما:
- **UUID الداخلي** للمتجر (الموجود في الداشبورد — موصى به)
- **Salla Merchant ID** (الرقم الموجود في سلة)

---

## المصادقة

### للعملاء (Storefront)

نظام OTP عبر رقم الجوال → يرجع JWT.

```
Authorization: Bearer <customer_token>
```

---

## 1. إعدادات التطبيق

### `GET /v1/store/:storeId/config`

**لا يحتاج auth.** أول استدعاء عند تشغيل التطبيق — يرجع اسم المتجر، اللوجو، الألوان.

**Response:**
```json
{
  "storeId": "cmqpkvkmj0000u6ikrke040fr",
  "sallaMerchantId": "1799277417",
  "appName": "متجر موكافا",
  "logoUrl": "https://cdn.salla.sa/...",
  "primaryColor": "#1f8a70",
  "secondaryColor": "#0b3d3a",
  "currency": "SAR",
  "metadata": {}
}
```

> احفظ `storeId` محلياً في التطبيق — تحتاجه في كل الطلبات.

---

## 2. تسجيل الدخول (OTP)

### `POST /v1/store/:storeId/auth/otp/request`

طلب كود OTP على رقم الجوال.

**Body:**
```json
{
  "phone": "966500000000"
}
```

**Response:**
```json
{
  "sent": true,
  "debug_code": "1234"
}
```

> ملاحظة: `debug_code` يظهر فقط عندما `OTP_DEBUG=true` في `.env` (بيئة التطوير).
> في الإنتاج يُرسل الكود عبر SMS.

---

### `POST /v1/store/:storeId/auth/otp/verify`

التحقق من الكود واستلام JWT.

**Body:**
```json
{
  "phone": "966500000000",
  "code": "1234",
  "name": "اسم العميل"
}
```

> `name` اختياري — يُستخدم فقط عند إنشاء حساب جديد.

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "id": "cuid123",
    "phone": "966500000000",
    "name": "اسم العميل",
    "email": null
  }
}
```

> احفظ `token` واستخدمه في header كل الطلبات المحمية:
> `Authorization: Bearer <token>`

---

## 3. الكتالوج (بدون auth)

### `GET /v1/store/:storeId/categories`

قائمة التصنيفات النشطة مرتبة حسب الترتيب.

**Response:**
```json
[
  {
    "id": "cuid...",
    "sallaId": "12345",
    "name": "ملابس",
    "parentSallaId": null,
    "imageUrl": "https://cdn.salla.sa/...",
    "sortOrder": 0,
    "isActive": true
  }
]
```

---

### `GET /v1/store/:storeId/products`

قائمة المنتجات مع pagination وفلترة.

**Query Params:**

| الاسم | النوع | الوصف |
|-------|-------|-------|
| `page` | number | رقم الصفحة (افتراضي: 1) |
| `per_page` | number | عدد النتائج (افتراضي: 20، أقصى: 100) |
| `category_id` | string | فلترة بالتصنيف (ID الداخلي) |
| `search` | string | بحث في اسم المنتج |

**مثال:**
```
GET /v1/store/cmq.../products?page=1&per_page=20&category_id=cuid...&search=قميص
```

**Response:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "sallaId": "98765",
      "name": "قميص أبيض",
      "description": "...",
      "price": "150.00",
      "salePrice": "120.00",
      "currency": "SAR",
      "quantity": 50,
      "sku": "TS-001",
      "status": "sale",
      "mainImage": "https://cdn.salla.sa/...",
      "images": ["url1", "url2"],
      "categoryId": "cuid...",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### `GET /v1/store/:storeId/products/:productId`

تفاصيل منتج واحد. `productId` يقبل UUID الداخلي أو Salla product ID.

**Response:** نفس شكل المنتج أعلاه مع إضافة:
```json
{
  "category": {
    "id": "cuid...",
    "name": "ملابس",
    ...
  }
}
```

---

## 4. الملف الشخصي (يحتاج auth)

### `GET /v1/store/:storeId/me`

بيانات العميل المسجّل مع عناوينه.

**Response:**
```json
{
  "id": "cuid...",
  "phone": "966500000000",
  "name": "اسم العميل",
  "email": "customer@example.com",
  "addresses": [
    {
      "id": "cuid...",
      "city": "الرياض",
      "district": "النزهة",
      "street": "شارع الملك فهد",
      "details": "بناية 5، شقة 3",
      "country": "SA",
      "isDefault": true
    }
  ]
}
```

---

### `PUT /v1/store/:storeId/me`

تحديث بيانات العميل.

**Body:**
```json
{
  "name": "اسم جديد",
  "email": "new@example.com"
}
```

---

### `GET /v1/store/:storeId/me/addresses`

قائمة العناوين المحفوظة (العنوان الافتراضي أولاً).

---

### `POST /v1/store/:storeId/me/addresses`

إضافة عنوان جديد.

**Body:**
```json
{
  "city": "جدة",
  "district": "الروضة",
  "street": "شارع التحلية",
  "details": "برج A، الطابق 3",
  "country": "SA",
  "isDefault": false
}
```

---

## 5. السلة (يحتاج auth)

### `GET /v1/store/:storeId/cart`

عرض السلة الحالية.

**Response:**
```json
{
  "id": "cuid...",
  "items": [
    {
      "id": "cuid...",
      "productId": "cuid...",
      "name": "قميص أبيض",
      "image": "https://cdn.salla.sa/...",
      "quantity": 2,
      "unitPrice": "120.00",
      "lineTotal": "240.00",
      "options": {}
    }
  ],
  "itemCount": 2,
  "total": "240.00",
  "currency": "SAR"
}
```

---

### `POST /v1/store/:storeId/cart/items`

إضافة منتج للسلة. إذا كان المنتج موجوداً تُجمع الكميات.

**Body:**
```json
{
  "productId": "cuid_or_salla_id",
  "quantity": 1,
  "options": { "color": "أحمر", "size": "L" }
}
```

> `options` اختياري.
**Response:** السلة المحدّثة (نفس شكل GET cart).

---

### `PUT /v1/store/:storeId/cart/items/:itemId`

تعديل كمية عنصر. إذا كانت الكمية 0 يُحذف العنصر.

**Body:**
```json
{ "quantity": 3 }
```

---

### `DELETE /v1/store/:storeId/cart/items/:itemId`

حذف عنصر من السلة.

---

### `DELETE /v1/store/:storeId/cart`

تفريغ السلة كاملاً.

---

## 6. الطلبات (يحتاج auth)

### `POST /v1/store/:storeId/orders`

تحويل السلة الحالية إلى طلب. يُنشئ draft order في سلة تلقائياً.

**Body:**
```json
{
  "addressId": "cuid_address",
  "paymentMethod": "cod",
  "note": "ملاحظة للبائع"
}
```

> جميع الحقول اختيارية. تأكد أن السلة ليست فارغة.

**Response:**
```json
{
  "id": "cuid...",
  "sallaOrderId": "88991234",
  "referenceId": "ORD-2026-001",
  "status": "PENDING",
  "statusLabel": "draft",
  "total": "240.00",
  "currency": "SAR",
  "paymentMethod": "cod",
  "shippingAddress": { "city": "جدة", ... },
  "items": [
    {
      "id": "cuid...",
      "name": "قميص أبيض",
      "quantity": 2,
      "unitPrice": "120.00",
      "options": {}
    }
  ],
  "createdAt": "2026-06-23T00:00:00.000Z"
}
```

---

### `GET /v1/store/:storeId/orders`

قائمة طلبات العميل الحالي مرتبة من الأحدث.

---

### `GET /v1/store/:storeId/orders/:orderId`

تفاصيل طلب واحد.

---

## حالات الطلب (Order Status)

| القيمة | الوصف |
|--------|-------|
| `PENDING` | قيد الانتظار / draft |
| `CONFIRMED` | مؤكد |
| `PROCESSING` | قيد التجهيز |
| `SHIPPED` | تم الشحن |
| `DELIVERED` | تم التسليم |
| `CANCELLED` | ملغي |
| `REFUNDED` | مسترد |

---

## أكواد الأخطاء

| الكود | المعنى |
|-------|--------|
| `400` | بيانات غير صحيحة (Body validation) |
| `401` | توكن منتهي أو غير صالح |
| `403` | ممنوع (محاولة الوصول لبيانات متجر آخر) |
| `404` | العنصر غير موجود |
| `429` | تجاوز حد الطلبات |
| `503` | Salla API غير متاح مؤقتاً |

**شكل الخطأ:**
```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

## سيناريو استخدام كامل في Expo

```typescript
const BASE = "https://api.mokkafa.com";
const STORE_ID = "cmqpkvkmj0000u6ikrke040fr"; // من /config

// 1. عند تشغيل التطبيق
const config = await fetch(`${BASE}/v1/store/${STORE_ID}/config`).then(r => r.json());

// 2. تسجيل دخول العميل
await fetch(`${BASE}/v1/store/${STORE_ID}/auth/otp/request`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "966500000000" }),
});

const { token, customer } = await fetch(`${BASE}/v1/store/${STORE_ID}/auth/otp/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "966500000000", code: "1234" }),
}).then(r => r.json());

const authHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

// 3. تصفح المنتجات
const { data: products, pagination } = await fetch(
  `${BASE}/v1/store/${STORE_ID}/products?page=1&per_page=20`
).then(r => r.json());

// 4. إضافة للسلة
const cart = await fetch(`${BASE}/v1/store/${STORE_ID}/cart/items`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ productId: products[0].id, quantity: 1 }),
}).then(r => r.json());

// 5. إنشاء طلب
const order = await fetch(`${BASE}/v1/store/${STORE_ID}/orders`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ paymentMethod: "cod" }),
}).then(r => r.json());
```
