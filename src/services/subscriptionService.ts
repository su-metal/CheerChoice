import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { ensureSupabaseAnonymousAuth, getCurrentSupabaseUserId } from './authService';

const PREMIUM_STATUS_KEY = '@CheerChoice:isPremium';

const PREMIUM_ENTITLEMENT_ID =
  (process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'premium').trim();

const IOS_API_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '').trim();
const ANDROID_API_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '').trim();

let isConfigured = false;

function getPlatformApiKey(): string {
  if (Platform.OS === 'ios') {
    return IOS_API_KEY;
  }
  if (Platform.OS === 'android') {
    return ANDROID_API_KEY;
  }
  return '';
}

function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

async function cachePremiumStatus(value: boolean): Promise<void> {
  await AsyncStorage.setItem(PREMIUM_STATUS_KEY, value ? 'true' : 'false');
}

export async function getCachedPremiumStatus(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PREMIUM_STATUS_KEY);
  return raw === 'true';
}

export async function configureRevenueCat(): Promise<boolean> {
  if (isConfigured) {
    return true;
  }

  const apiKey = getPlatformApiKey();
  if (!apiKey) {
    return false;
  }

  const appUserId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth()) ?? undefined;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  isConfigured = true;
  return true;
}

export async function refreshPremiumStatus(): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) {
    return getCachedPremiumStatus();
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = hasPremiumEntitlement(customerInfo);
    await cachePremiumStatus(isPremium);
    return isPremium;
  } catch (error) {
    console.error('Error refreshing premium status:', error);
    return getCachedPremiumStatus();
  }
}

export async function purchasePremium(): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('RevenueCat API key is missing.');
  }

  const offerings = await Purchases.getOfferings();
  const packageToBuy = offerings.current?.availablePackages?.[0];
  if (!packageToBuy) {
    throw new Error('No purchasable package is available.');
  }

  const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
  const isPremium = hasPremiumEntitlement(customerInfo);
  await cachePremiumStatus(isPremium);
  return isPremium;
}

export async function restorePremiumPurchases(): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) {
    throw new Error('RevenueCat API key is missing.');
  }

  const customerInfo = await Purchases.restorePurchases();
  const isPremium = hasPremiumEntitlement(customerInfo);
  await cachePremiumStatus(isPremium);
  return isPremium;
}
