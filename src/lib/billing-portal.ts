/**
 * Stripe customer portal for AI Texting plans bought in the browser — where a
 * web subscriber updates their card or cancels (the store apps send people to
 * Google Play / Apple subscriptions instead).
 */

import { Alert } from 'react-native';

import { api, ApiError, errorMessage } from '@/lib/api-client';

const RETURN_PATH = '/sms-setup';

export async function openBillingPortal(): Promise<void> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { url } = await api.post<{ url: string }>('/phone-numbers/subscription/portal', {
      returnUrl: `${origin}${RETURN_PATH}`,
    });
    if (!/^https:\/\/billing\.stripe\.com\//.test(url)) throw new Error('Unexpected billing link.');
    window.location.assign(url);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      Alert.alert(
        'Managed in the phone app',
        'This plan was bought through the App Store or Google Play. Manage or cancel it in your phone’s subscription settings.',
      );
      return;
    }
    Alert.alert("Couldn't open billing", errorMessage(err, 'Please try again in a moment.'));
  }
}
