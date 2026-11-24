/**
 * OTP authentication against the documented Middleware endpoints.
 *
 * Only reached when EXPO_PUBLIC_DATA_SOURCE=api.
 * `debug_code` is NEVER read — it is a development-only field.
 * The JWT is stored in SecureStore via src/api/token.ts and sent as
 * `Authorization: Bearer <token>` by the centralized client.
 */

import type { User } from "@/src/types";
import type {
  AuthRepository,
  PhoneRegistrationInput,
  RepoResult,
} from "@/src/repositories/types";
import { apiClient } from "@/src/api/client";
import { API_PATHS } from "@/src/api/endpoints";
import { ApiError, shouldFallbackToMock } from "@/src/api/errors";
import { apiErrorTranslationKey } from "@/src/api/errorMessages";
import { mapApiCustomer } from "@/src/api/mappers";
import type {
  ApiCustomerProfile,
  ApiOtpRequest,
  ApiOtpRequestResponse,
  ApiOtpVerifyRequest,
  ApiOtpVerifyResponse,
} from "@/src/api/types";
import { clearCustomerToken, readCustomerToken, saveCustomerToken } from "@/src/api/token";
import { currentStoreId } from "@/src/repositories/apiShared";

/** Docs use a full number without `+`, e.g. "966500000000". */
export function normalizePhoneForApi(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

let pendingName: string | undefined;
/** The login screen calls loginWithPhone then requestOtp; avoid sending twice. */
let skipNextOtpRequest = false;

function failure(error: unknown): RepoResult<never> {
  return { ok: false, error: apiErrorTranslationKey(error) };
}

async function sendOtp(phone: string): Promise<RepoResult<{ phone: string }>> {
  const normalized = normalizePhoneForApi(phone);
  if (!normalized) return { ok: false, error: "errPhoneInvalid" };
  try {
    // The response's `debug_code` is intentionally ignored.
    const response = await apiClient.post<ApiOtpRequestResponse>(
      API_PATHS.auth.requestOtp(currentStoreId()),
      { phone: normalized } satisfies ApiOtpRequest,
    );
    if (!response || typeof response.sent !== "boolean") {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    if (!response?.sent) return { ok: false, error: "apiUnavailable" };
    return { ok: true, data: { phone } };
  } catch (error) {
    if (shouldFallbackToMock(error)) throw error;
    return failure(error);
  }
}

export const apiAuthRepository: AuthRepository = {
  /** Email/password login is not part of the documented API. */
  async login() {
    return { ok: false, error: "apiUnsupportedAuth" };
  },
  async register() {
    return { ok: false, error: "apiUnsupportedAuth" };
  },

  async logout() {
    pendingName = undefined;
    skipNextOtpRequest = false;
    await clearCustomerToken();
  },

  async restoreSession(): Promise<{ user: User; token: string } | null> {
    const token = await readCustomerToken();
    if (!token) return null;
    try {
      const profile = await apiClient.get<ApiCustomerProfile>(API_PATHS.profile.me(currentStoreId()));
      if (!profile?.id) {
        throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
      }
      return { user: mapApiCustomer(profile), token };
    } catch (error) {
      if (shouldFallbackToMock(error)) throw error;
      // 401/403 is already handled by the client (token cleared). Never crash.
      return null;
    }
  },

  async loginWithPhone(phone) {
    const sent = await sendOtp(phone);
    if (!sent.ok) return sent;
    skipNextOtpRequest = true;
    // No customer lookup endpoint exists in the API docs; OTP is the lookup.
    return { ok: true, data: {} };
  },

  async registerWithPhone(input: PhoneRegistrationInput) {
    // The docs have no register endpoint; `name` is sent at OTP verification.
    pendingName = input.name;
    const sent = await sendOtp(input.phone);
    if (sent.ok) {
      // authStore.registerWithPhone calls requestOtp immediately afterwards.
      // Skip that duplicate call, just like loginWithPhone.
      skipNextOtpRequest = true;
      return { ok: true, data: {} };
    }
    pendingName = undefined;
    return sent;
  },

  async requestOtp(phone) {
    if (skipNextOtpRequest) {
      skipNextOtpRequest = false;
      return { ok: true, data: { phone } };
    }
    return sendOtp(phone);
  },

  async verifyOtp(phone, code, name) {
    const body: ApiOtpVerifyRequest = {
      phone: normalizePhoneForApi(phone),
      code: (code ?? "").replace(/\D/g, ""),
    };
    const finalName = name ?? pendingName;
    if (finalName) body.name = finalName;
    pendingName = undefined;
    skipNextOtpRequest = false;

    try {
      const response = await apiClient.post<ApiOtpVerifyResponse>(
        API_PATHS.auth.verifyOtp(currentStoreId()),
        body,
      );
      if (!response?.token || !response.customer?.id) {
        throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
      }
      await saveCustomerToken(response.token);
      return {
        ok: true,
        data: { user: mapApiCustomer(response.customer), token: response.token },
      };
    } catch (error) {
      if (shouldFallbackToMock(error)) throw error;
      return failure(error);
    }
  },
};
