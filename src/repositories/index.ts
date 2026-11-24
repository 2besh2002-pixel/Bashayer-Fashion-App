/**
 * Repository registry — the single selection point between mock and API.
 *
 * Screens, stores and hooks depend on these interfaces, never on a concrete
 * implementation. The default is `mock`; setting EXPO_PUBLIC_DATA_SOURCE=api
 * opts into the API before startup. A network or timeout failure switches the
 * whole repository set to mock for the rest of the session.
 */

import { getEnvironment } from "@/src/config/environment";
import { setConnectionFailureHandler } from "@/src/api/client";
import { shouldFallbackToMock } from "@/src/api/errors";
import { installCustomerTokenProvider } from "@/src/api/token";

import type {
  AddressRepository,
  AuthRepository,
  CartRepository,
  CatalogRepository,
  NotificationRepository,
  OrderRepository,
  ProfileRepository,
  StoreConfigRepository,
} from "@/src/repositories/types";
import { mockAuthRepository } from "@/src/repositories/mockAuthRepository";
import { mockCatalogRepository } from "@/src/repositories/mockCatalogRepository";
import {
  mockAddressRepository,
  mockNotificationRepository,
  mockOrderRepository,
} from "@/src/repositories/mockCommerceRepositories";
import {
  mockCartRepository,
  mockProfileRepository,
  mockStoreConfigRepository,
} from "@/src/repositories/mockPreparedRepositories";
import { apiAuthRepository } from "@/src/repositories/apiAuthRepository";
import { apiCatalogRepository } from "@/src/repositories/apiCatalogRepository";
import {
  apiAddressRepository,
  apiCartRepository,
  apiOrderRepository,
  apiProfileRepository,
  apiStoreConfigRepository,
} from "@/src/repositories/apiCommerceRepositories";

interface RepositorySet {
  auth: AuthRepository;
  catalog: CatalogRepository;
  orders: OrderRepository;
  addresses: AddressRepository;
  cart: CartRepository;
  profile: ProfileRepository;
  config: StoreConfigRepository;
  notifications: NotificationRepository;
}

const mockSet: RepositorySet = {
  auth: mockAuthRepository,
  catalog: mockCatalogRepository,
  orders: mockOrderRepository,
  addresses: mockAddressRepository,
  cart: mockCartRepository,
  profile: mockProfileRepository,
  config: mockStoreConfigRepository,
  // No documented notification endpoints: local data in both modes.
  notifications: mockNotificationRepository,
};

let connectionFailed = false;
setConnectionFailureHandler(() => {
  connectionFailed = true;
});

function withMockFallback<T extends object>(apiRepository: T, mockRepository: T): T {
  return new Proxy(apiRepository, {
    get(_target, property) {
      const apiMethod = Reflect.get(apiRepository, property);
      if (typeof apiMethod !== "function") return apiMethod;

      return async (...args: unknown[]) => {
        const useMock = () => {
          const mockMethod = Reflect.get(mockRepository, property);
          if (typeof mockMethod !== "function") {
            throw new TypeError("Mock repository method is not available.");
          }
          return Reflect.apply(mockMethod, mockRepository, args);
        };
        if (connectionFailed || getEnvironment().dataSource !== "api") {
          return useMock();
        }

        let result: unknown;
        try {
          result = await Reflect.apply(apiMethod, apiRepository, args);
        } catch (error) {
          if (!connectionFailed && !shouldFallbackToMock(error)) throw error;
          connectionFailed = true;
          return useMock();
        }
        return result;
      };
    },
  });
}

const resilientApiSet: RepositorySet = {
  auth: withMockFallback(apiAuthRepository, mockAuthRepository),
  catalog: withMockFallback(apiCatalogRepository, mockCatalogRepository),
  orders: withMockFallback(apiOrderRepository, mockOrderRepository),
  addresses: withMockFallback(apiAddressRepository, mockAddressRepository),
  cart: withMockFallback(apiCartRepository, mockCartRepository),
  profile: withMockFallback(apiProfileRepository, mockProfileRepository),
  config: withMockFallback(apiStoreConfigRepository, mockStoreConfigRepository),
  notifications: mockNotificationRepository,
};

function activeSet(): RepositorySet {
  return getEnvironment().dataSource === "api" && !connectionFailed ? resilientApiSet : mockSet;
}

/** Wire the SecureStore JWT provider only when API mode is actually enabled. */
if (getEnvironment().dataSource === "api") {
  installCustomerTokenProvider();
}

/** Read the active source in one place (useful for tests and diagnostics). */
export function getRepositorySource(): "mock" | "api" {
  return getEnvironment().dataSource === "api" && !connectionFailed ? "api" : "mock";
}

/** Reset the runtime fallback state between tests. */
export function resetRepositoryFallbackForTests(): void {
  connectionFailed = false;
}

export const repositories: RepositorySet = {
  get auth() {
    return activeSet().auth;
  },
  get catalog() {
    return activeSet().catalog;
  },
  get orders() {
    return activeSet().orders;
  },
  get addresses() {
    return activeSet().addresses;
  },
  get cart() {
    return activeSet().cart;
  },
  get profile() {
    return activeSet().profile;
  },
  get config() {
    return activeSet().config;
  },
  get notifications() {
    return activeSet().notifications;
  },
};

export type {
  AddressRepository,
  AuthRepository,
  CartRepository,
  CatalogRepository,
  NotificationRepository,
  OrderRepository,
  ProfileRepository,
  StoreConfigRepository,
};
