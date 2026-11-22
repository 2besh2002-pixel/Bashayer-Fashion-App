import { create } from "zustand";

import type { User } from "@/src/types";
import type { TranslationKey } from "@/src/i18n/translations";
import type { PhoneRegistrationInput } from "@/src/repositories/types";
import { repositories } from "@/src/repositories";

type AuthStatus = "idle" | "authenticating";

interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  initialized: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<TranslationKey | null>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<TranslationKey | null>;
  // Phone + OTP local demonstration (additive).
  loginWithPhone: (phone: string) => Promise<TranslationKey | null>;
  registerWithPhone: (input: PhoneRegistrationInput) => Promise<TranslationKey | null>;
  requestOtp: (phone: string) => Promise<TranslationKey | null>;
  verifyOtp: (phone: string, code: string) => Promise<TranslationKey | null>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

/**
 * Authentication store.
 *
 * Uses the local demo AuthRepository. Guest shopping data (cart/wishlist) lives
 * in its own stores and is intentionally NOT cleared on login/logout, so guest
 * data survives authentication (see requirement on preserving guest data).
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  status: "idle",
  initialized: false,
  isAuthenticated: false,
  login: async (email, password) => {
    set({ status: "authenticating" });
    const result = await repositories.auth.login(email, password);
    if (result.ok) {
      set({
        user: result.data.user,
        token: result.data.token,
        isAuthenticated: true,
        status: "idle",
      });
      return null;
    }
    set({ status: "idle" });
    return result.error;
  },
  register: async (name, email, password) => {
    set({ status: "authenticating" });
    const result = await repositories.auth.register(name, email, password);
    if (result.ok) {
      set({
        user: result.data.user,
        token: result.data.token,
        isAuthenticated: true,
        status: "idle",
      });
      return null;
    }
    set({ status: "idle" });
    return result.error;
  },

  // ---- Phone + OTP local demonstration -------------------------------------

  /** Verify that the number belongs to a local demo account, then request an OTP. */
  loginWithPhone: async (phone) => {
    set({ status: "authenticating" });
    const lookup = await repositories.auth.loginWithPhone(phone);
    if (!lookup.ok) {
      set({ status: "idle" });
      return lookup.error;
    }
    const request = await repositories.auth.requestOtp(phone);
    set({ status: "idle" });
    return request.ok ? null : request.error;
  },

  /** Create the local demo profile, then request an OTP. No secret is stored. */
  registerWithPhone: async (input) => {
    set({ status: "authenticating" });
    const created = await repositories.auth.registerWithPhone(input);
    if (!created.ok) {
      set({ status: "idle" });
      return created.error;
    }
    const request = await repositories.auth.requestOtp(input.phone);
    set({ status: "idle" });
    return request.ok ? null : request.error;
  },

  requestOtp: async (phone) => {
    set({ status: "authenticating" });
    const result = await repositories.auth.requestOtp(phone);
    set({ status: "idle" });
    return result.ok ? null : result.error;
  },

  /** Any 4 digits are accepted for this UI prototype; a demo token is issued. */
  verifyOtp: async (phone, code) => {
    set({ status: "authenticating" });
    const result = await repositories.auth.verifyOtp(phone, code);
    if (result.ok) {
      set({
        user: result.data.user,
        token: result.data.token,
        isAuthenticated: true,
        status: "idle",
      });
      return null;
    }
    set({ status: "idle" });
    return result.error;
  },

  logout: async () => {
    const token = get().token;
    await repositories.auth.logout(token);
    set({ user: null, token: null, isAuthenticated: false });
    // Cart + wishlist intentionally preserved for the guest.
  },
  restore: async () => {
    const session = await repositories.auth.restoreSession();
    set({
      user: session?.user ?? get().user,
      token: session?.token ?? get().token,
      isAuthenticated: Boolean(session?.user ?? get().user),
      initialized: true,
    });
  },
}));
