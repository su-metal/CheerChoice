export const IS_PREMIUM = false;

export const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';
export const TERMS_OF_SERVICE_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? '';

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const PREMIUM_PRICE_USD = toNumber(process.env.EXPO_PUBLIC_PREMIUM_PRICE_USD, 6.99);
