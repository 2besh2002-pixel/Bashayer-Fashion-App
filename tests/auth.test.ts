jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { mockAuthRepository } from "../src/repositories/mockAuthRepository";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("local demo phone + OTP authentication", () => {
  test("the seeded demo phone can request and verify an OTP", async () => {
    const lookup = await mockAuthRepository.loginWithPhone("+966500000000");
    expect(lookup.ok).toBe(true);

    const requested = await mockAuthRepository.requestOtp("+966500000000");
    expect(requested.ok).toBe(true);

    const verified = await mockAuthRepository.verifyOtp("+966500000000", "1234");
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.data.user.phone).toBe("+966500000000");
  });

  test("an unknown phone is rejected and never reaches the OTP stage", async () => {
    const lookup = await mockAuthRepository.loginWithPhone("+966111111111");
    expect(lookup.ok).toBe(false);
    if (!lookup.ok) expect(lookup.error).toBe("errAccountNotFound");
  });

  test("registration rejects duplicates and stores only public fields", async () => {
    const first = await mockAuthRepository.registerWithPhone({
      name: "Test User",
      email: "user@example.com",
      phone: "+966555555555",
      countryCode: "+966",
    });
    expect(first.ok).toBe(true);

    const duplicate = await mockAuthRepository.registerWithPhone({
      name: "Another",
      email: "other@example.com",
      phone: "+966555555555",
      countryCode: "+966",
    });
    expect(duplicate.ok).toBe(false);

    const raw = await AsyncStorage.getItem("naseej:users");
    expect(raw).not.toContain("password");
    expect(raw).toContain("+966555555555");
  });

  test("OTP requires exactly four digits", async () => {
    const short = await mockAuthRepository.verifyOtp("+966500000000", "123");
    expect(short.ok).toBe(false);
    const long = await mockAuthRepository.verifyOtp("+966500000000", "12345");
    expect(long.ok).toBe(false);
  });
});
