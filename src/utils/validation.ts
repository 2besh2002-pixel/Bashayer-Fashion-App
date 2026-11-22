import type { TranslationKey } from "@/src/i18n/translations";

export interface LoginValues {
  email: string;
  password: string;
}

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export type FieldErrors<K extends string> = Partial<Record<K, TranslationKey>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateLogin(values: LoginValues): FieldErrors<"email" | "password"> {
  const errors: FieldErrors<"email" | "password"> = {};
  if (!values.email.trim()) errors.email = "errEmailRequired";
  else if (!isValidEmail(values.email)) errors.email = "errEmailInvalid";
  if (!values.password) errors.password = "errPasswordRequired";
  return errors;
}

export function validateRegister(values: RegisterValues): FieldErrors<
  "name" | "email" | "password" | "confirm"
> {
  const errors: FieldErrors<"name" | "email" | "password" | "confirm"> = {};
  if (!values.name.trim()) errors.name = "errNameRequired";
  if (!values.email.trim()) errors.email = "errEmailRequired";
  else if (!isValidEmail(values.email)) errors.email = "errEmailInvalid";
  if (!values.password) errors.password = "errPasswordRequired";
  else if (values.password.length < 6) errors.password = "errPasswordShort";
  if (values.confirm !== values.password) errors.confirm = "errPasswordMismatch";
  return errors;
}

export function hasErrors(errors: Record<string, unknown>): boolean {
  return Object.keys(errors).length > 0;
}

// ---------------------------------------------------------------------------
// Phone + OTP (local demo authentication)
// The email/password validators above are kept intact for backward
// compatibility; the phone flow below is additive.
// ---------------------------------------------------------------------------

export interface PhoneValues {
  phone: string;
}

export interface PhoneRegistrationValues extends PhoneValues {
  name: string;
  email: string;
  countryCode?: string;
}

/** Strip everything except digits so "+966 50 000 0000" becomes a comparable number. */
export function phoneDigits(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Local-demo rule: at least 7 digits (E.164 allows up to 15). */
export function isValidPhone(phone: string): boolean {
  const digits = phoneDigits(phone);
  return digits.length >= 7 && digits.length <= 15;
}

/** Build the full local demo number from a dial code and the typed national number. */
export function toFullPhone(countryCode: string, phone: string): string {
  const digits = phoneDigits(phone);
  return digits ? `${countryCode}${digits}` : "";
}

/** Accepts four single-digit entries or a joined four-digit code. */
export function isValidOtp(code: string | string[]): boolean {
  const joined = Array.isArray(code) ? code.join("") : code;
  return /^\d{4}$/.test(joined);
}

export function validatePhone(values: PhoneValues): FieldErrors<"phone"> {
  const errors: FieldErrors<"phone"> = {};
  if (!isValidPhone(values.phone)) errors.phone = "errPhoneInvalid";
  return errors;
}

export function validatePhoneRegistration(
  values: PhoneRegistrationValues,
): FieldErrors<"name" | "email" | "phone"> {
  const errors: FieldErrors<"name" | "email" | "phone"> = {};
  if (!values.name.trim()) errors.name = "errNameRequired";
  if (!values.email.trim()) errors.email = "errEmailRequired";
  else if (!isValidEmail(values.email)) errors.email = "errEmailInvalid";
  if (!isValidPhone(values.phone)) errors.phone = "errPhoneInvalid";
  return errors;
}

export function validateOtp(code: string | string[]): FieldErrors<"otp"> {
  const errors: FieldErrors<"otp"> = {};
  if (!isValidOtp(code)) errors.otp = "errOtpInvalid";
  return errors;
}