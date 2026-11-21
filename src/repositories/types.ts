import type {
  Address,
  Category,
  Lang,
  Notification,
  Order,
  Product,
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
  /** Look up an existing local demo account by phone. Does not authenticate. */
  loginWithPhone(phone: string): Promise<RepoResult<{ user: User }>>;
  /** Create a local demo account (public profile only) before OTP. */
  registerWithPhone(input: PhoneRegistrationInput): Promise<RepoResult<{ user: User }>>;
  /** Simulate sending an OTP. No SMS is sent in this prototype. */
  requestOtp(phone: string): Promise<RepoResult<{ phone: string }>>;
  /** Accept any 6 digits in this UI prototype and issue a demo session. */
  verifyOtp(phone: string, code: string): Promise<RepoResult<{ user: User; token: string }>>;
}

export interface CatalogRepository {
  listProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
  search(query: string, lang: Lang): Promise<Product[]>;
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