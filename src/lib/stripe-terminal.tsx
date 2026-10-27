/**
 * Tap to Pay — Stripe Terminal on the phone's NFC reader, the RN counterpart
 * to the Swift TapToPayService.
 *
 * `PaymentsTerminalProvider` scopes a StripeTerminalProvider to the screens
 * that take payments (its token provider calls
 * POST /stripe/payments/terminal/connection-token). Inside it, `useTapToPay()`
 * returns a `charge()` that runs the full flow:
 *
 *   initialize → location permission (expo-location) → Terminal location
 *   (first of GET /terminal/locations, cached in AsyncStorage; if none, offer
 *   to create one from the business address) → discoverReaders('tapToPay') →
 *   connectReader → POST /terminal/create-intent → retrievePaymentIntent →
 *   collectPaymentMethod → confirmPaymentIntent (→ /terminal/capture when the
 *   intent requires capture).
 *
 * Resolves to the charge details (brand lowercased), `null` when the customer
 * or merchant cancelled, and throws a readable Error otherwise — including
 * plain-language messages for devices without NFC / Tap to Pay support.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ErrorCode,
  StripeTerminalProvider,
  useStripeTerminal,
  type PaymentIntent,
  type Reader,
  type StripeError,
} from '@stripe/stripe-terminal-react-native';
import * as Location from 'expo-location';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert } from 'react-native';

import {
  captureTerminalPayment,
  createConnectionToken,
  createTerminalIntent,
  createTerminalLocation,
  listTerminalLocations,
} from '@/api/stripe';
import { useBusinessSettings } from '@/context/business-settings-store';
import { useSession } from '@/context/session';
import { uuid } from '@/lib/id';
import { assertChargeable, toCents, type ChargeRequest, type ChargeResult } from '@/lib/stripe-charge';
import type { BusinessAddress } from '@/models/business-settings';

const LOCATION_CACHE_KEY = 'stripe.terminal.locationId';
const DISCOVERY_TIMEOUT_MS = 30_000;

export function PaymentsTerminalProvider({ children }: { children: ReactElement | ReactElement[] }) {
  return <StripeTerminalProvider tokenProvider={createConnectionToken}>{children}</StripeTerminalProvider>;
}

/** Thrown for a cancelled collect/confirm — callers treat it as "no charge". */
class CancelledError extends Error {}

const UNSUPPORTED_MESSAGES: Partial<Record<string, string>> = {
  [ErrorCode.TAP_TO_PAY_UNSUPPORTED_DEVICE]:
    "This phone doesn't support Tap to Pay. It needs NFC and a supported model — use Card instead.",
  [ErrorCode.TAP_TO_PAY_UNSUPPORTED_ANDROID_VERSION]:
    'Tap to Pay needs a newer version of Android. Update your phone, or use Card instead.',
  [ErrorCode.TAP_TO_PAY_NFC_DISABLED]: 'NFC is turned off. Turn on NFC in your phone settings, then try again.',
  [ErrorCode.TAP_TO_PAY_LIBRARY_NOT_INCLUDED]: "Tap to Pay isn't included in this build of the app.",
  [ErrorCode.TAP_TO_PAY_DEVICE_TAMPERED]: "Tap to Pay can't run on a rooted or modified device.",
  [ErrorCode.TAP_TO_PAY_INSECURE_ENVIRONMENT]:
    "Tap to Pay can't run while developer options, screen recording or a debugger is active.",
  [ErrorCode.TAP_TO_PAY_DEBUG_NOT_SUPPORTED]: "Tap to Pay can't run in a debuggable build. Use a release build.",
};

function terminalError(err: StripeError): Error {
  if (err.code === ErrorCode.CANCELED) return new CancelledError(err.message);
  return new Error(UNSUPPORTED_MESSAGES[err.code] ?? err.message);
}

/** Promise wrapper around a two-button Alert. */
function confirm(title: string, message: string, action: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, onPress: () => resolve(true) },
    ]),
  );
}

/** Stripe wants an ISO alpha-2 country; payments are USD so default to US. */
function countryCode(country: string): string {
  const c = country.trim();
  if (/^[a-z]{2}$/i.test(c)) return c.toUpperCase();
  if (/^(united states( of america)?|usa|u\.s\.a?\.?)$/i.test(c)) return 'US';
  if (/^canada$/i.test(c)) return 'CA';
  return 'US';
}

function cardDetails(pi: PaymentIntent.Type) {
  const details =
    pi.paymentMethod?.cardPresentDetails ??
    pi.paymentMethod?.interacPresentDetails ??
    pi.charges?.[0]?.paymentMethodDetails?.cardPresentDetails;
  return { brand: details?.brand, last4: details?.last4 };
}

export function useTapToPay() {
  const { account } = useSession();
  const { address } = useBusinessSettings();
  const [status, setStatus] = useState<string | null>(null);
  const readersWaiter = useRef<((readers: Reader.Type[]) => void) | null>(null);

  const terminal = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      if (readers.length > 0 && readersWaiter.current) {
        const resolve = readersWaiter.current;
        readersWaiter.current = null;
        resolve(readers);
      }
    },
  });

  const businessName = account?.businessName || account?.name || 'ToolBelt';

  /** Cached location id → first server location → offer to create one. */
  const resolveLocationId = useCallback(
    async (addr: BusinessAddress): Promise<string> => {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY).catch(() => null);
      if (cached) return cached;

      const locations = await listTerminalLocations();
      let id = locations[0]?.id;
      if (!id) {
        if (!addr.street.trim()) {
          throw new Error(
            'No reader location set up yet. Add your business address in Settings → Business Info, then try Tap to Pay again.',
          );
        }
        const line = [addr.street, addr.city, addr.state].filter((p) => p.trim()).join(', ');
        const ok = await confirm(
          'No reader location set up yet',
          `Stripe needs a location for Tap to Pay. Create one at your business address (${line})?`,
          'Create Location',
        );
        if (!ok) throw new CancelledError('Location not created');
        const created = await createTerminalLocation({
          displayName: businessName,
          address: {
            line1: addr.street.trim(),
            line2: addr.apt.trim() || undefined,
            city: addr.city.trim() || undefined,
            state: addr.state.trim() || undefined,
            postal_code: addr.zip.trim() || undefined,
            country: countryCode(addr.country),
          },
        });
        id = created.id;
      }
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, id).catch(() => {});
      return id;
    },
    [businessName],
  );

  const discoverReader = useCallback(async (): Promise<Reader.Type> => {
    const found = new Promise<Reader.Type[]>((resolve) => {
      readersWaiter.current = resolve;
    });
    // discoverReaders resolves when discovery ends; an error means it failed.
    const failed = terminal.discoverReaders({ discoveryMethod: 'tapToPay' }).then(({ error }) => {
      if (error) throw terminalError(error);
      return new Promise<never>(() => {});
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Couldn't start Tap to Pay on this phone. Please try again.")), DISCOVERY_TIMEOUT_MS),
    );
    try {
      const readers = await Promise.race([found, failed, timeout]);
      return readers[0];
    } finally {
      readersWaiter.current = null;
    }
  }, [terminal]);

  const ensureConnected = useCallback(async () => {
    if (!terminal.isInitialized) {
      setStatus('Starting Tap to Pay…');
      const { error, reader } = await terminal.initialize();
      if (error) throw terminalError(error);
      // initialize() hands back a reader that's still connected from before.
      if (reader) return;
    }
    if (terminal.connectedReader) return;

    setStatus('Checking location access…');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      throw new Error('Tap to Pay needs location access (a Stripe requirement). Allow it in your phone settings, then try again.');
    }

    setStatus('Finding your reader location…');
    const locationId = await resolveLocationId(address);

    setStatus('Preparing the reader…');
    const reader = await discoverReader();
    const { error } = await terminal.connectReader({
      discoveryMethod: 'tapToPay',
      reader,
      locationId,
      merchantDisplayName: businessName,
    });
    if (error) {
      // A stale cached location is the most likely culprit — refetch next time.
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY).catch(() => {});
      throw terminalError(error);
    }
  }, [terminal, resolveLocationId, address, discoverReader, businessName]);

  const charge = useCallback(
    async ({ amount, description }: ChargeRequest): Promise<ChargeResult | null> => {
      try {
        assertChargeable(amount);
        await ensureConnected();

        setStatus('Creating payment…');
        const intent = await createTerminalIntent({
          amount: toCents(amount),
          description,
          idempotencyKey: uuid(),
        });

        const retrieved = await terminal.retrievePaymentIntent(intent.clientSecret);
        if (retrieved.error) throw terminalError(retrieved.error);

        setStatus('Hold the card near the phone…');
        const collected = await terminal.collectPaymentMethod({ paymentIntent: retrieved.paymentIntent });
        if (collected.error) throw terminalError(collected.error);

        setStatus('Processing…');
        const confirmed = await terminal.confirmPaymentIntent({ paymentIntent: collected.paymentIntent });
        if (confirmed.error) throw terminalError(confirmed.error);

        const pi = confirmed.paymentIntent;
        let { brand, last4 } = cardDetails(pi);
        let paymentStatus = 'succeeded';
        if (pi.status === 'requiresCapture') {
          const captured = await captureTerminalPayment(intent.paymentIntentId);
          paymentStatus = captured.paymentStatus;
          brand = captured.cardBrand ?? brand;
          last4 = captured.cardLast4 ?? last4;
        }
        return {
          paymentIntentId: intent.paymentIntentId,
          paymentStatus,
          cardBrand: brand ? brand.toLowerCase() : undefined,
          cardLast4: last4 || undefined,
        };
      } catch (err) {
        if (err instanceof CancelledError) return null;
        throw err;
      } finally {
        setStatus(null);
      }
    },
    [ensureConnected, terminal],
  );

  return { charge, status };
}
