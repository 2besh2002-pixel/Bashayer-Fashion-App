import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { AppTextInput } from '@/src/components/ui/AppTextInput';
import { Button } from '@/src/components/ui/Button';
import { Icon } from '@/src/components/ui/Icon';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import type { TranslationKey } from '@/src/i18n/translations';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useAuthStore } from '@/src/stores/authStore';
import { getRepositorySource } from '@/src/repositories';
import { colors } from '@/src/theme/tokens';
import { PLAYFAIR_ITALIC } from '@/src/theme/typography';
import {
  hasErrors,
  phoneDigits,
  toFullPhone,
  validateOtp,
  validatePhone,
  type FieldErrors,
} from '@/src/utils/validation';

const OTP_LENGTH = 4;

const COUNTRIES: readonly { code: string; flag: string; label: TranslationKey }[] = [
  { code: '+966', flag: 'SA', label: 'countrySA' },
  { code: '+971', flag: 'AE', label: 'countryAE' },
  { code: '+1', flag: 'US', label: 'countryUS' },
  { code: '+44', flag: 'GB', label: 'countryGB' },
];

type Stage = 'form' | 'otp' | 'success';
type FieldKey = 'phone' | 'otp';
type Country = (typeof COUNTRIES)[number];

function translateErrors<K extends string>(
  errors: FieldErrors<K>,
  t: (key: TranslationKey) => string,
): Partial<Record<K, string>> {
  const result: Partial<Record<K, string>> = {};
  (Object.keys(errors) as K[]).forEach((key) => {
    const value = errors[key];
    if (value) result[key] = t(value);
  });
  return result;
}

/** Wine-tinted, start-bordered message matching the reference `.field-error`. */
function ErrorBox({ message, isRTL }: { message: string; isRTL: boolean }) {
  return (
    <View
      className="my-2 rounded-[7px] bg-[#f9ecee] px-3 py-2.5"
      style={{
        borderLeftWidth: isRTL ? 0 : 3,
        borderRightWidth: isRTL ? 3 : 0,
        borderLeftColor: '#a34250',
        borderRightColor: '#a34250',
      }}
    >
      <AppText
        className="text-[9px] text-[#862e3c]"
        style={{ lineHeight: 15, textAlign: isRTL ? 'right' : 'left' }}
      >
        {message}
      </AppText>
    </View>
  );
}

function CountryFlag({ flag }: { flag: string }) {
  return (
    <View className="h-[22px] w-[28px] items-center justify-center rounded-[5px] bg-[#f0ebe5]">
      <AppText weight={700} className="text-[8px] text-wine" style={{ letterSpacing: 0.4 }}>
        {flag}
      </AppText>
    </View>
  );
}

function AuthHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View className="mb-6 items-center">
      <View className="mb-2.5 h-[52px] w-[52px] items-center justify-center rounded-full bg-wine">
        <AppText
          weight={600}
          serif
          italic
          className="text-[24px] text-white"
          style={{ fontFamily: PLAYFAIR_ITALIC }}
        >
          N
        </AppText>
      </View>
      <AppText weight={700} className="text-[9px] text-wine" style={{ letterSpacing: 2 }}>
        NASEEJ
      </AppText>
      <AppText
        serif
        weight={600}
        className="mt-2 text-center text-[25px] text-ink"
        style={{ lineHeight: 32 }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

function DemoDisclosure({
  text,
  isRTL,
  success = false,
}: {
  text: string;
  isRTL: boolean;
  success?: boolean;
}) {
  return (
    <View
      className={`flex-row items-start gap-2.5 rounded-[10px] bg-[#f4f0ea] px-3 py-3 ${success ? '' : 'mb-4 mt-1'}`}
    >
      <Icon name="help" size={18} color={colors.wine} />
      <AppText
        className="flex-1 text-[8px] text-muted"
        style={{ lineHeight: 14, textAlign: isRTL ? 'right' : 'left' }}
      >
        {text}
      </AppText>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const loginWithPhone = useAuthStore((s) => s.loginWithPhone);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [stage, setStage] = useState<Stage>('form');
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''));
  const otpRefs = useRef<({ focus: () => void } | null)[]>([]);

  const isOtpComplete = otp.every((digit) => digit !== '');
  const incompleteOtp = !isOtpComplete && otp.some((digit) => digit !== '');
  const otpError = errors.otp ?? (incompleteOtp ? 'errOtpInvalid' : null);

  const busy = status === 'authenticating';
  const mockMode = getRepositorySource() === 'mock';
  const fullPhone = toFullPhone(country.code, phone);
  const phoneTail = phoneDigits(fullPhone).slice(-3).padStart(3, '•');
  const maskedPhone = `${country.code} ••• ••• ${phoneTail}`;

  const clearFeedback = () => {
    setErrors({});
    setFormError(null);
  };

  const submitDetails = async () => {
    if (busy) return;
    clearFeedback();
    const validation = validatePhone({ phone });
    setErrors(translateErrors<FieldKey>(validation, t));
    if (hasErrors(validation)) return;

    // Login checks the number against the seeded demo account and locally
    // registered phones. Unknown numbers never reach the OTP stage.
    const error = await loginWithPhone(fullPhone);
    if (error) {
      setFormError(t(error));
      return;
    }
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setStage('otp');
  };

  /**
   * Update one OTP box. A multi-digit value (for example a pasted code) is
   * spread across the boxes from the current index, or fills all boxes when a
   * complete code is pasted, and focus advances to the next empty box.
   */
  const updateOtp = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length > 1) {
      // A multi-digit value (e.g. a paste): spread the code across the boxes.
      const pasted = digits.slice(0, OTP_LENGTH).split('');
      const start = pasted.length >= OTP_LENGTH ? 0 : Math.min(index, OTP_LENGTH - pasted.length);
      setOtp((current) => {
        const next = [...current];
        if (pasted.length >= OTP_LENGTH) {
          // A complete code fills every box.
          for (let i = 0; i < OTP_LENGTH; i++) next[i] = pasted[i] ?? '';
        } else {
          pasted.forEach((digit, offset) => {
            next[Math.min(start + offset, OTP_LENGTH - 1)] = digit;
          });
        }
        return next;
      });
      if (pasted.length < OTP_LENGTH) {
        const lastFilled = Math.min(start + pasted.length - 1, OTP_LENGTH - 1);
        otpRefs.current[Math.min(lastFilled + 1, OTP_LENGTH - 1)]?.focus();
      }
      return;
    }

    const digit = digits.slice(-1);
    setOtp((current) => current.map((item, i) => (i === index ? digit : item)));
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (!digit && index > 0 && otp[index] === '') otpRefs.current[index - 1]?.focus();
  };

  const verify = async () => {
    if (busy) return;
    clearFeedback();
    const validation = validateOtp(otp);
    setErrors(translateErrors<FieldKey>(validation, t));
    if (hasErrors(validation)) return;

    const error = await verifyOtp(fullPhone, otp.join(''));
    if (error) {
      setFormError(t(error));
      return;
    }
    setStage('success');
  };

  const editPhone = () => {
    setStage('form');
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    clearFeedback();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={t('titleLogin')} showBack />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: stage === 'success' ? 'center' : undefined,
            paddingHorizontal: 24,
            paddingTop: 25,
            paddingBottom: 45,
          }}
        >
          {stage === 'success' ? (
            <View className="items-center">
              <View className="mb-[22px] h-[108px] w-[108px] items-center justify-center rounded-full bg-[#f5e9eb]">
                <View className="h-[82px] w-[82px] items-center justify-center rounded-full bg-wine">
                  <Icon name="check" size={34} color="#fff" />
                </View>
              </View>
              <AppText weight={700} className="text-[9px] text-wine" style={{ letterSpacing: 2 }}>
                NASEEJ
              </AppText>
              <AppText
                serif
                weight={600}
                className="mt-2 text-center text-[25px] text-ink"
                style={{ lineHeight: 32 }}
              >
                {t('authLoginTitle')}
              </AppText>
              <AppText
                className="mt-2 text-center text-[10px] text-muted"
                style={{ lineHeight: 18 }}
              >
                {t('loginSuccessText')}
              </AppText>
              <View className="mt-5 w-full">
                <DemoDisclosure
                  text={t(mockMode ? 'smsDemoDisclosure' : 'smsServerDisclosure')}
                  isRTL={isRTL}
                  success
                />
              </View>
              <Button
                onPress={() => router.replace('/(tabs)/account')}
                iconRight="arrow"
                className="mt-3"
              >
                {t('continueToHome')}
              </Button>
            </View>
          ) : stage === 'otp' ? (
            <View>
              <AuthHeader title={t('verifyPhoneTitle')}>
                <AppText
                  className="mt-1 text-center text-[10px] text-muted"
                  style={{ lineHeight: 18 }}
                >
                  {t('verifyPhoneText')}
                </AppText>
                <AppText
                  weight={700}
                  className="mt-1 text-center text-[12px] text-ink"
                  style={{ direction: 'ltr', writingDirection: 'ltr' }}
                >
                  {maskedPhone}
                </AppText>
              </AuthHeader>

              <DemoDisclosure
                text={t(mockMode ? 'otpDemoDisclosure' : 'otpServerDisclosure')}
                isRTL={isRTL}
              />

              <AppText
                weight={600}
                className="mb-2 text-[9px] text-ink"
                style={{ textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('verificationCode')}
              </AppText>
              <View className="flex-row justify-between" style={{ direction: 'ltr', gap: 7 }}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(node) => {
                      otpRefs.current[index] = node as { focus: () => void } | null;
                    }}
                    value={digit}
                    onChangeText={(value) => updateOtp(index, value)}
                    onKeyPress={(event) => {
                      if (event.nativeEvent.key === 'Backspace' && !digit && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    textContentType={index === 0 ? 'oneTimeCode' : undefined}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    accessibilityLabel={`${t('verificationCode')} ${index + 1}`}
                    placeholder="•"
                    placeholderTextColor="#c9c0b8"
                    className="h-[52px] flex-1 rounded-[10px] border border-line bg-white text-center text-[19px] font-bold text-ink"
                    style={{
                      direction: 'ltr',
                      writingDirection: 'ltr',
                      textAlign: 'center',
                      borderColor: otpError ? colors.wine : colors.line,
                    }}
                  />
                ))}
              </View>
              {otpError ? <ErrorBox message={otpError} isRTL={isRTL} /> : null}
              {formError ? <ErrorBox message={formError} isRTL={isRTL} /> : null}

              <View className="mb-5 mt-[15px] flex-row items-center justify-between gap-2.5">
                <AppText className="text-[8px] text-muted">
                  {t('resendIn')}{' '}
                  <AppText weight={700} style={{ direction: 'ltr', writingDirection: 'ltr' }}>
                    00:38
                  </AppText>
                </AppText>
                <Pressable disabled accessibilityRole="button">
                  <AppText className="text-[8px] font-bold text-[#aaa19a]">
                    {t('resendCode')}
                  </AppText>
                </Pressable>
              </View>

              <Button onPress={verify} loading={busy} iconRight="arrow" disabled={!isOtpComplete}>
                {t('verifyContinue')}
              </Button>

              <Pressable
                onPress={editPhone}
                className="mx-auto mt-[18px] flex-row items-center justify-center gap-1.5"
                accessibilityRole="button"
              >
                <Icon name="edit" size={16} color={colors.wine} />
                <AppText weight={700} className="text-[9px] text-wine">
                  {t('editPhone')}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <View>
              <AuthHeader title={t('authLoginTitle')}>
                <AppText
                  className="mt-1 text-center text-[10px] text-muted"
                  style={{ lineHeight: 18 }}
                >
                  {t('authLoginSubtitlePhone')}
                </AppText>
              </AuthHeader>

              <View className="mb-3">
                <View className="mb-1.5 flex-row" style={{ direction: 'ltr' }}>
                  <AppText weight={600} className="text-[9px] text-ink" style={{ width: 108 }}>
                    {t('countryCode')}
                  </AppText>
                  <AppText
                    weight={600}
                    className="flex-1 text-[9px] text-ink"
                    style={{ paddingLeft: 12 }}
                  >
                    {t('mobileNumber')}
                  </AppText>
                </View>
                <View className="relative">
                  <View
                    className="h-[49px] flex-row items-stretch rounded-[10px] border border-line bg-white"
                    style={{ direction: 'ltr' }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('chooseCountryCode')}
                      onPress={() => setCountryOpen((open) => !open)}
                      className="min-w-[108px] flex-row items-center justify-center gap-1.5 border-r border-line px-2.5"
                      style={{ direction: 'ltr' }}
                    >
                      <CountryFlag flag={country.flag} />
                      <AppText
                        weight={700}
                        className="text-[10px] text-ink"
                        style={{ direction: 'ltr', writingDirection: 'ltr' }}
                      >
                        {country.code}
                      </AppText>
                      <View style={{ transform: [{ rotate: '90deg' }] }}>
                        <Icon name="chevron" size={13} color={colors.muted} />
                      </View>
                    </Pressable>
                    <AppTextInput
                      value={phone}
                      onChangeText={(value) => {
                        setPhone(value);
                        if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                      }}
                      placeholder={t('phonePlaceholder')}
                      placeholderTextColor="#9a928b"
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel-national"
                      className="flex-1 px-3 text-[11px] text-ink"
                      style={{
                        height: '100%',
                        direction: 'ltr',
                        writingDirection: 'ltr',
                        textAlign: 'left',
                      }}
                    />
                  </View>

                  {countryOpen ? (
                    <View
                      className="absolute left-0 right-0 top-[54px] z-20 rounded-[13px] border border-line bg-paper p-1.5"
                      style={{
                        elevation: 8,
                        shadowColor: '#2d221c',
                        shadowOpacity: 0.16,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 8 },
                      }}
                    >
                      <AppText className="px-2.5 pb-2 pt-1.5 text-[8px] text-muted">
                        {t('chooseCountryCode')}
                      </AppText>
                      {COUNTRIES.map((item) => {
                        const selected = item.flag === country.flag;
                        return (
                          <Pressable
                            key={item.flag}
                            accessibilityRole="button"
                            onPress={() => {
                              setCountry(item);
                              setCountryOpen(false);
                            }}
                            className={`min-h-[43px] flex-row items-center gap-2 rounded-lg px-2 py-1 ${selected ? 'bg-[#f5ebec]' : ''}`}
                          >
                            <CountryFlag flag={item.flag} />
                            <AppText
                              className={`flex-1 text-[9px] ${selected ? 'text-wine' : 'text-ink'}`}
                            >
                              {t(item.label)}
                            </AppText>
                            <AppText
                              weight={700}
                              className="text-[9px] text-ink"
                              style={{ direction: 'ltr', writingDirection: 'ltr' }}
                            >
                              {item.code}
                            </AppText>
                            <View className="w-[20px] items-center">
                              {selected ? <Icon name="check" size={15} color={colors.wine} /> : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <AppText
                  className="mt-1.5 text-[8px] text-muted"
                  style={{ lineHeight: 13, textAlign: isRTL ? 'right' : 'left' }}
                >
                  {t('phoneFieldHint')}
                </AppText>
                {errors.phone ? <ErrorBox message={errors.phone} isRTL={isRTL} /> : null}
              </View>

              {formError ? <ErrorBox message={formError} isRTL={isRTL} /> : null}

              <Button onPress={submitDetails} loading={busy} iconRight="arrow" className="mt-[18px]">
                {t('continue')}
              </Button>

              <View className="mb-[23px] mt-[17px] flex-row items-center justify-center gap-1">
                <AppText className="text-[10px] text-muted">{t('newToBrand')}</AppText>
                <Pressable onPress={() => router.replace('/register')} accessibilityRole="button">
                  <AppText weight={700} className="text-[10px] text-wine">
                    {t('createAccountShort')}
                  </AppText>
                </Pressable>
              </View>

              <AppText
                className="px-5 text-center text-[8px] text-muted"
                style={{ lineHeight: 14 }}
              >
                {t('termsNotice')}
              </AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
