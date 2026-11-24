import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import type { User } from "@/src/types";
import type { AuthRepository, PhoneRegistrationInput } from "@/src/repositories/types";

/**
 * Local demonstration authentication.
 *
 * This is NOT production authentication: demo passwords are held only in memory
 * and there is no server-side identity verification. Never present this
 * as secure. A real implementation is prepared in apiAuthRepository.ts: it calls
 * the documented OTP endpoints (API_PATHS.auth) and keeps the returned JWT in
 * SecureStore only. Mock tokens are never sent to a real backend.
 *
 * The phone + OTP flow is likewise a UI prototype: any 4 digits are accepted and
 * no SMS is ever sent. Only public profile fields are persisted to AsyncStorage.
 */

const USERS_KEY = "naseej:users";
const TOKEN_KEY = "naseej:session";

interface StoredUser extends User {
  password?: never;
}

const DEMO_USER: StoredUser = {
  id: "demo-user",
  name: "Noura Alotaibi",
  email: "test@naseej.com",
  phone: "+966500000000",
  countryCode: "+966",
};

// Passwords exist only in memory for this demo and are never persisted.
const registeredPasswords = new Map<string, string>();

/** Only public profile fields are ever written to disk — never a secret. */
function publicFields(user: StoredUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.countryCode ? { countryCode: user.countryCode } : {}),
  };
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) return [DEMO_USER];
    const parsed = (JSON.parse(raw) as Partial<StoredUser>[])
      .filter((u): u is StoredUser => Boolean(u.id && u.name && u.email))
      .map((u) => publicFields(u as StoredUser) as StoredUser);
    // Always keep the seeded demo account (with its phone) available.
    const demoIndex = parsed.findIndex(
      (u) => u.id === DEMO_USER.id || normalizeEmail(u.email) === normalizeEmail(DEMO_USER.email),
    );
    if (demoIndex >= 0) {
      parsed[demoIndex] = {
        ...parsed[demoIndex],
        phone: DEMO_USER.phone,
        countryCode: DEMO_USER.countryCode,
      };
    } else {
      parsed.unshift(DEMO_USER);
    }
    await writeUsers(parsed);
    return parsed;
  } catch {
    return [DEMO_USER];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.map(publicFields)));
}

function toPublic(user: StoredUser): User {
  return publicFields(user);
}

function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

function phoneDigits(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function persistToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // SecureStore is unavailable on some platforms (e.g. web preview) — non-fatal.
  }
}

export const mockAuthRepository: AuthRepository = {
  async login(email, password) {
    const users = await readUsers();
    const normalized = normalizeEmail(email);
    const match = users.find((u) => normalizeEmail(u.email) === normalized);
    if (match && !registeredPasswords.has(normalized)) {
      return { ok: false, error: "errInvalidCredentials" };
    }
    if (match && registeredPasswords.get(normalized) !== password) {
      return { ok: false, error: "errInvalidCredentials" };
    }
    if (!match) return { ok: false, error: "errInvalidCredentials" };
    const token = `demo-token-${match.id}`;
    await persistToken(token);
    return { ok: true, data: { user: toPublic(match), token } };
  },

  async register(name, email, password) {
    const users = await readUsers();
    const normalized = normalizeEmail(email);
    if (users.some((u) => normalizeEmail(u.email) === normalized)) {
      return { ok: false, error: "errEmailExists" };
    }
    const user: StoredUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalized,
    };
    await writeUsers([...users, user]);
    registeredPasswords.set(normalized, password);
    const token = `demo-token-${user.id}`;
    await persistToken(token);
    return { ok: true, data: { user: toPublic(user), token } };
  },

  async logout(token) {
    if (token) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {
        // ignore
      }
    }
  },

  async restoreSession() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return null;
      const users = await readUsers();
      const id = token.replace("demo-token-", "");
      const match = users.find((u) => u.id === id);
      return match ? { user: toPublic(match), token } : null;
    } catch {
      return null;
    }
  },

  // ---- Phone + OTP local demonstration -------------------------------------

  async loginWithPhone(phone) {
    const users = await readUsers();
    const target = phoneDigits(phone);
    const match = users.find((u) => Boolean(u.phone) && phoneDigits(u.phone!) === target);
    if (!match) return { ok: false, error: "errAccountNotFound" };
    // Lookup only — the demo session is issued after OTP verification.
    return { ok: true, data: { user: toPublic(match) } };
  },

  async registerWithPhone(input: PhoneRegistrationInput) {
    const users = await readUsers();
    const email = normalizeEmail(input.email);
    const phone = input.phone.trim();
    const target = phoneDigits(phone);
    const duplicate = users.some(
      (u) =>
        normalizeEmail(u.email) === email ||
        (Boolean(u.phone) && phoneDigits(u.phone!) === target),
    );
    if (duplicate) return { ok: false, error: "errAccountExists" };

    const user: StoredUser = {
      id: `user-${Date.now()}`,
      name: input.name.trim(),
      email,
      phone,
      countryCode: input.countryCode,
    };
    await writeUsers([...users, user]);
    return { ok: true, data: { user: toPublic(user) } };
  },

  async requestOtp(phone) {
    // Simulate an async request so the UI can show a loading state.
    // No SMS is sent — this is disclosed in the UI copy.
    await delay(450);
    return { ok: true, data: { phone } };
  },

  async verifyOtp(phone, code) {
    if (!/^\d{4}$/.test(phoneDigits(code))) {
      return { ok: false, error: "errOtpInvalid" };
    }
    const users = await readUsers();
    const target = phoneDigits(phone);
    const match = users.find((u) => Boolean(u.phone) && phoneDigits(u.phone!) === target);
    if (!match) return { ok: false, error: "errAccountNotFound" };
    const token = `demo-token-${match.id}`;
    await persistToken(token);
    return { ok: true, data: { user: toPublic(match), token } };
  },
};
