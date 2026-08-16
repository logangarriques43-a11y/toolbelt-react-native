/**
 * Google Play Billing boundary (react-native-iap v16).
 *
 * This is the ONLY file that talks to react-native-iap. Its exact call shapes
 * are version-specific, so the SDK surface is loosely typed here (`as any` at
 * the boundary) and everything above it stays cleanly typed. The native module
 * doesn't exist in Expo Go, so all calls no-op unless IAP_AVAILABLE.
 *
 * Flow: connect() on app start → a purchaseUpdated listener delivers purchases
 * → we hand the purchaseToken to OUR backend to verify+acknowledge (server-side
 * per the contract), then finish() the transaction to clear the local queue.
 * The subscription's entitlement is read from the backend, not from here.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';

export const PRO_PRODUCT_ID = 'toolbelt_pro_monthly';
export const PACKAGE_NAME = 'tools.toolbelt.app';
export const PLAY_MANAGE_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?sku=${PRO_PRODUCT_ID}&package=${PACKAGE_NAME}`;

/** Real Android build only (react-native-iap's native module isn't in Expo Go). */
export const IAP_AVAILABLE = Platform.OS === 'android' && Constants.appOwnership !== 'expo';

export interface IapPurchase {
  productId: string;
  purchaseToken: string;
  /** The raw SDK purchase, needed to finish() the transaction. */
  raw: unknown;
}

export interface IapError {
  userCancelled: boolean;
  message: string;
}

const anyIAP = IAP as unknown as Record<string, (...args: unknown[]) => any>;

function toPurchase(p: any): IapPurchase | null {
  const purchaseToken: string | undefined = p?.purchaseToken ?? p?.purchaseTokenAndroid;
  const productId: string | undefined = p?.productId ?? p?.ids?.[0];
  if (!purchaseToken || !productId) return null;
  return { productId, purchaseToken, raw: p };
}

export async function connect(): Promise<void> {
  if (IAP_AVAILABLE) await anyIAP.initConnection();
}

export async function disconnect(): Promise<void> {
  if (IAP_AVAILABLE) await anyIAP.endConnection();
}

/** Localized price + Android offer token for the subscription base plan. */
export async function fetchProOffer(): Promise<{ price: string; offerToken?: string }> {
  if (!IAP_AVAILABLE) return { price: '$15.00' };
  try {
    const products: any[] = await anyIAP.fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'subs' });
    const product = products?.[0];
    const offer =
      product?.subscriptionOfferDetailsAndroid?.[0] ?? product?.subscriptionOfferDetails?.[0];
    const price =
      offer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ??
      product?.displayPrice ??
      '$15.00';
    return { price, offerToken: offer?.offerToken };
  } catch {
    return { price: '$15.00' };
  }
}

/** Launch the Play purchase sheet. Result is delivered via addPurchaseListeners. */
export async function requestProPurchase(offerToken?: string): Promise<void> {
  if (!IAP_AVAILABLE) return;
  await anyIAP.requestPurchase({
    type: 'subs',
    request: {
      android: {
        skus: [PRO_PRODUCT_ID],
        subscriptionOffers: offerToken ? [{ sku: PRO_PRODUCT_ID, offerToken }] : [],
      },
    },
  });
}

/** Purchases already owned (restore after reinstall / new device). */
export async function listOwnedPurchases(): Promise<IapPurchase[]> {
  if (!IAP_AVAILABLE) return [];
  const purchases: any[] = await anyIAP.getAvailablePurchases();
  return (purchases ?? []).map(toPurchase).filter((p): p is IapPurchase => p !== null);
}

/** Clear a purchase from the local queue AFTER the backend verified+acknowledged it. */
export async function finishPurchase(raw: unknown): Promise<void> {
  if (!IAP_AVAILABLE) return;
  try {
    await anyIAP.finishTransaction({ purchase: raw, isConsumable: false });
  } catch {
    // already finished/acknowledged server-side — safe to ignore
  }
}

export function addPurchaseListeners(
  onPurchase: (p: IapPurchase) => void,
  onError: (e: IapError) => void,
): () => void {
  if (!IAP_AVAILABLE) return () => {};
  const up = anyIAP.purchaseUpdatedListener((p: any) => {
    const parsed = toPurchase(p);
    if (parsed) onPurchase(parsed);
  });
  const err = anyIAP.purchaseErrorListener((e: any) => {
    onError({ userCancelled: e?.code === 'E_USER_CANCELLED' || !!e?.userCancelled, message: e?.message ?? 'Purchase failed.' });
  });
  return () => {
    up?.remove?.();
    err?.remove?.();
  };
}

/** Opens the Google Play subscriptions center for manage/cancel. */
export async function openManageSubscriptions(): Promise<void> {
  if (!IAP_AVAILABLE) return;
  try {
    await anyIAP.deepLinkToSubscriptions({ skuAndroid: PRO_PRODUCT_ID });
  } catch {
    const { Linking } = await import('react-native');
    Linking.openURL(PLAY_MANAGE_SUBSCRIPTIONS_URL);
  }
}
