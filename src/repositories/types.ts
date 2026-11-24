import type {
  Address,
  CartItem,
  Category,
  Lang,
  Notification,
  Order,
  Product,
  StoreConfigSnapshot,
  User,
} from "@/src/types";
import type { TranslationKey } from "@/src/i18n/translations";

/** Result shape shared by async local repositories. */
export type RepoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TranslationKey };

export interface PhoneRegistrationInput {
  name: string;
  email: string;
  /** Full number including dial code, e.g. "+966500000000". */
  phone: string;
  /** Dial code only, e.g. "+966". */
  countryCode: string;
}

export interface AuthRepository {
  /** Returns the authenticated user + a session token on success. */
  login(email: string, password: string): Promise<RepoResult<{ user: User; token: string }>>;
  register(
    name: string,
    email: string,
    password: string,
  ): Promise<RepoResult<{ user: User; token: string }>>;
  logout(token: string | null): Promise<void>;
  /** Restore a persisted demo session, if any. */
  restoreSession(): Promise<{ user: User; token: string } | null>;

  // ---- Phone + OTP local demonstration methods (additive) ----
  /**
   * Look up an existing local demo account by phone. Does not authenticate.
   * The API implementation may only send an OTP and return no user yet.
   */
  loginWithPhone(phone: string): Promise<RepoResult<{ user?: User }>>;
  /** Create a local demo account (public profile only) before OTP. */
  registerWithPhone(input: PhoneRegistrationInput): Promise<RepoResult<{ user?: User }>>;
  /** Simulate sending an OTP. No SMS is sent in this prototype. */
  requestOtp(phone: string): Promise<RepoResult<{ phone: string }>>;
  /** Accept any 4 digits in this UI prototype and issue a demo session. */
  verifyOtp(
    phone: string,
    code: string,
    /** Only used by the future API implementation when creating a new customer. */
    name?: string,
  ): Promise<RepoResult<{ user: User; token: string }>>;
}

/** Only the four documented server-side query parameters are represented. */
export interface CatalogQuery {
  page?: number;
  perPage?: number;
  categoryId?: string;
  search?: string;
}

export interface ProductPage {
  items: Product[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CatalogRepository {
  listProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
  search(query: string, lang: Lang): Promise<Product[]>;
  /** Prepared for GET /products?page&per_page&category_id&search. */
  listProductsPaged(query?: CatalogQuery): Promise<ProductPage>;
}

/**
 * Prepared cart contract. The UI still uses the local Zustand cart in BOTH
 * modes (variation prices/stock are local); this interface is the future
 * server-sync boundary and is not wired to screens yet.
 */
export interface CartRepository {
  get(): Promise<CartItem[]>;
  add(productId: string, quantity: number, options?: Record<string, unknown>): Promise<CartItem[]>;
  setQuantity(itemId: string, quantity: number): Promise<CartItem[]>;
  remove(itemId: string): Promise<CartItem[]>;
  clear(): Promise<CartItem[]>;
}

/** Prepared for GET /me and PUT /me. The current UI reads the local auth user. */
export interface ProfileRepository {
  get(): Promise<User | null>;
  update(input: { name?: string; email?: string }): Promise<User | null>;
}

/** Prepared for GET /config. The local store-configs file stays authoritative. */
export interface StoreConfigRepository {
  get(): Promise<StoreConfigSnapshot>;
}

export interface OrderRepository {
  list(): Promise<Order[]>;
  get(id: string): Promise<Order | undefined>;
  /** Locally create a demonstration order from a checkout payload. */
  create(order: Order): Promise<Order>;
}

export interface AddressRepository {
  list(): Promise<Address[]>;
  add(address: Address): Promise<Address[]>;
}

export interface NotificationRepository {
  list(): Promise<Notification[]>;
}