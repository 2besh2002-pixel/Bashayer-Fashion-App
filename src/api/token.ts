/**
 * Customer JWT storage, prepared for the documented OTP flow.
 *
 * The token is kept in expo-secure-store (never AsyncStorage, never logs).
 * A SEPARATE key is used from the local demo session so a mock token can
 * never accidentally be sent to a real backend.
 *
 * In mock mode nothing here is called.
 */

import * as SecureStore from "expo-secure-store";

import { setAuthTokenProvider, setUnauthorizedHandler } from "@/src/api/client";

export const CUSTOMER_TOKEN_KEY = "naseej:customer-jwt";

export async function readCustomerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CUSTOMER_TOKEN_KEY);
  } catch {
    // SecureStore is unavailable on some platforms (e.g. web preview).
    return null;
  }
}

export async function saveCustomerToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CUSTOMER_TOKEN_KEY, token);
  } catch {
    // Non-fatal: the in-memory session still works until the app restarts.
  }
}

export async function clearCustomerToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CUSTOMER_TOKEN_KEY);
  } catch {
    // Non-fatal.
  }
}

/** Wire SecureStore into the client once, before any API repository is used. */
export function installCustomerTokenProvider(): void {
  setAuthTokenProvider(readCustomerToken);
  setUnauthorizedHandler(() => {
    void clearCustomerToken();
  });
}
