/**
 * Browser stand-in for Stripe's native PaymentSheet.
 *
 * `presentStripeForm()` opens a themed dialog holding Stripe's Payment Element
 * for a PaymentIntent (`mode: 'payment'`) or SetupIntent (`mode: 'setup'`)
 * client secret, and resolves once the customer pays / saves a card, or
 * cancels. Card details go straight from Stripe's iframe to Stripe — they never
 * touch our page or our server, so the PCI scope matches the native sheet.
 *
 * `<StripeFormHost />` is mounted once by `web-hosts.web.tsx`. Only the web
 * build imports this file.
 */

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme, type AppTheme } from '@/theme/theme-context';

export interface StripeFormRequest {
  publishableKey: string;
  /** Connected account id for Connect charges; omit for the platform account. */
  stripeAccount?: string;
  clientSecret: string;
  mode: 'payment' | 'setup';
  title: string;
  subtitle?: string;
  submitLabel: string;
}

export type StripeFormOutcome =
  | { status: 'succeeded'; intentId: string; paymentMethodId?: string }
  | { status: 'cancelled' };

interface Pending {
  request: StripeFormRequest;
  resolve: (o: StripeFormOutcome) => void;
}

// Module-level store read with useSyncExternalStore: the React Compiler
// memoizes plain reads of module variables, so a component that just read
// `pending` during render would never see a new request.
let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getPending = () => pending;
const getServerPending = () => null;

/** Open the card form. Only one can be open; a second call cancels the first. */
export function presentStripeForm(request: StripeFormRequest): Promise<StripeFormOutcome> {
  return new Promise((resolve) => {
    pending?.resolve({ status: 'cancelled' });
    pending = { request, resolve };
    emit();
  });
}

function settle(outcome: StripeFormOutcome) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(outcome);
}

const stripeCache = new Map<string, Promise<Stripe | null>>();
function stripeFor(publishableKey: string, stripeAccount?: string) {
  const key = `${publishableKey}|${stripeAccount ?? ''}`;
  let p = stripeCache.get(key);
  if (!p) {
    p = loadStripe(publishableKey, stripeAccount ? { stripeAccount } : undefined);
    stripeCache.set(key, p);
  }
  return p;
}

function appearanceFor(theme: AppTheme): Appearance {
  return {
    theme: theme.isDark ? 'night' : 'stripe',
    variables: {
      colorPrimary: theme.accent,
      colorBackground: theme.inputBackground,
      colorText: theme.primaryText,
      colorTextSecondary: theme.secondaryText,
      borderRadius: '10px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  };
}

export function StripeFormHost() {
  const theme = useAppTheme();
  const current = useSyncExternalStore(subscribe, getPending, getServerPending);
  const request = current?.request;
  const stripePromise = useMemo(
    () => (request ? stripeFor(request.publishableKey, request.stripeAccount) : null),
    [request],
  );

  useEffect(() => {
    if (!request || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle({ status: 'cancelled' });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request]);

  if (!request || !stripePromise) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={() => settle({ status: 'cancelled' })} accessibilityLabel="Cancel" />
      <View
        role="dialog"
        aria-label={request.title}
        style={[styles.card, { backgroundColor: theme.cardBackground, borderRadius: theme.cornerRadius + 6 }]}>
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <Pressable onPress={() => settle({ status: 'cancelled' })} hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.accent }]}>Cancel</Text>
          </Pressable>
          <Text style={[theme.display(20), styles.title]} numberOfLines={1}>
            {request.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        {request.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{request.subtitle}</Text>
        ) : null}
        <Elements
          key={request.clientSecret}
          stripe={stripePromise}
          options={{ clientSecret: request.clientSecret, appearance: appearanceFor(theme) }}>
          <PaymentForm request={request} theme={theme} />
        </Elements>
      </View>
    </View>
  );
}

function PaymentForm({ request, theme }: { request: StripeFormRequest; theme: AppTheme }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError('');
    try {
      // Redirect-based methods come back to this page; card / wallets resolve inline.
      const confirmParams = { return_url: window.location.href };
      if (request.mode === 'payment') {
        const { error: err, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams,
          redirect: 'if_required',
        });
        if (err) throw new Error(err.message ?? 'The payment did not go through.');
        if (!paymentIntent || !['succeeded', 'processing', 'requires_capture'].includes(paymentIntent.status)) {
          throw new Error('The payment did not go through. Please try another card.');
        }
        const pm = paymentIntent.payment_method;
        settle({
          status: 'succeeded',
          intentId: paymentIntent.id,
          paymentMethodId: typeof pm === 'string' ? pm : pm?.id,
        });
      } else {
        const { error: err, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams,
          redirect: 'if_required',
        });
        if (err) throw new Error(err.message ?? 'The card could not be saved.');
        if (!setupIntent || setupIntent.status !== 'succeeded') {
          throw new Error('The card could not be saved. Please try another card.');
        }
        const pm = setupIntent.payment_method;
        settle({
          status: 'succeeded',
          intentId: setupIntent.id,
          paymentMethodId: typeof pm === 'string' ? pm : pm?.id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      <PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} />
      {!ready ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        onPress={() => void submit()}
        disabled={!stripe || !ready || busy}
        style={[
          styles.submit,
          { backgroundColor: theme.accent, borderRadius: theme.cornerRadius, opacity: !ready || busy ? 0.6 : 1 },
        ]}>
        {busy ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <Text style={[styles.submitText, { color: theme.onAccent }]}>{request.submitLabel}</Text>
        )}
      </Pressable>
      <Text style={[styles.secure, { color: theme.tertiaryText }]}>Payments are processed securely by Stripe.</Text>
    </form>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%' as unknown as number,
    overflow: 'scroll' as 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 16, fontWeight: '500', minWidth: 60 },
  title: { flex: 1, textAlign: 'center' },
  headerSpacer: { minWidth: 60 },
  subtitle: { fontSize: 15, textAlign: 'center', paddingTop: 16, paddingHorizontal: 20 },
  error: { color: '#FF3B30', fontSize: 14, textAlign: 'center' },
  submit: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  submitText: { fontSize: 17, fontWeight: '600' },
  secure: { fontSize: 12, textAlign: 'center' },
});
