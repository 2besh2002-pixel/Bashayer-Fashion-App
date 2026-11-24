/**
 * Typed API request/response models copied from API.md.
 *
 * These describe the REMOTE contract only. UI screens never consume them
 * directly — src/api/mappers.ts converts them to the app's existing models.
 * Optional / nullable fields are marked as such: never assume images, prices,
 * emails or extra objects are present.
 */

export interface ApiStoreConfig {
  storeId: string;
  sallaMerchantId?: string;
  appName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApiOtpRequest {
  /** Full number without a leading `+`, e.g. "966500000000". */
  phone: string;
}

export interface ApiOtpRequestResponse {
  sent: boolean;
  /** DEV ONLY. Present when OTP_DEBUG=true. Never depend on it in production. */
  debug_code?: string;
}

export interface ApiOtpVerifyRequest {
  phone: string;
  code: string;
  /** Optional: only used when creating a new customer. */
  name?: string;
}

export interface ApiCustomerIdentity {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
}

export interface ApiOtpVerifyResponse {
  token: string;
  customer: ApiCustomerIdentity;
}

export interface ApiCategory {
  id: string;
  sallaId?: string;
  name: string;
  parentSallaId?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ApiPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiProduct {
  id: string;
  sallaId?: string;
  name: string;
  description?: string | null;
  /** String amounts in the documented response, e.g. "150.00". */
  price?: string | number | null;
  salePrice?: string | number | null;
  currency?: string | null;
  quantity?: number | null;
  sku?: string | null;
  status?: string | null;
  mainImage?: string | null;
  images?: string[] | null;
  categoryId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ApiProductPage {
  data: ApiProduct[];
  pagination: ApiPagination;
}

/** Product details = product fields + an optional category object. */
export interface ApiProductDetail extends ApiProduct {
  category?: ApiCategory | null;
}

export interface ApiAddress {
  id: string;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  details?: string | null;
  country?: string | null;
  isDefault?: boolean;
}

export interface ApiCustomerProfile extends ApiCustomerIdentity {
  addresses?: ApiAddress[] | null;
}

export interface ApiUpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ApiCreateAddressRequest {
  city: string;
  district?: string;
  street?: string;
  details?: string;
  country?: string;
  isDefault?: boolean;
}

export interface ApiCartItem {
  id: string;
  productId: string;
  name?: string | null;
  image?: string | null;
  quantity: number;
  unitPrice?: string | number | null;
  lineTotal?: string | number | null;
  /** Generic object. Docs show { color, size } only; no structured variants. */
  options?: Record<string, unknown> | null;
}

export interface ApiCart {
  id?: string;
  items?: ApiCartItem[] | null;
  itemCount?: number;
  total?: string | number | null;
  currency?: string | null;
}

export interface ApiAddCartItemRequest {
  productId: string;
  quantity: number;
  /** Optional. Docs show { "color": "أحمر", "size": "L" }. */
  options?: Record<string, unknown>;
}

export interface ApiCartQuantityRequest {
  /** 0 removes the item (documented). */
  quantity: number;
}

export type ApiOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface ApiOrderItem {
  id?: string;
  name?: string | null;
  quantity?: number;
  unitPrice?: string | number | null;
  options?: Record<string, unknown> | null;
}

export interface ApiOrder {
  id: string;
  sallaOrderId?: string | null;
  referenceId?: string | null;
  status?: ApiOrderStatus | null;
  statusLabel?: string | null;
  total?: string | number | null;
  currency?: string | null;
  paymentMethod?: string | null;
  shippingAddress?: ApiAddress | null;
  items?: ApiOrderItem[] | null;
  createdAt?: string | null;
}

/** All fields are optional in the documented create-order body. */
export interface ApiCreateOrderRequest {
  addressId?: string;
  /** Only "cod" is documented. Other values need backend confirmation. */
  paymentMethod?: string;
  note?: string;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string;
  error?: string;
}
