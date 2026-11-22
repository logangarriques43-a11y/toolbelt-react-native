/**
 * Tap to Pay in the browser — not possible: it needs the phone's NFC reader and
 * Stripe's native Terminal SDK. Same exports as `stripe-terminal.tsx`, so the
 * checkout screens compile unchanged; the UI hides the Tap to Pay option on the
 * web (`TAP_TO_PAY_SUPPORTED` in `@/lib/platform`), and `charge()` explains
 * why if it is ever reached.
 */

import { useCallback, type ReactElement } from 'react';

import type { ChargeRequest, ChargeResult } from '@/lib/stripe-charge-shared';

export function PaymentsTerminalProvider({ children }: { children: ReactElement | ReactElement[] }) {
  return <>{children}</>;
}

export function useTapToPay() {
  const charge = useCallback(async (_req: ChargeRequest): Promise<ChargeResult | null> => {
    throw new Error('Tap to Pay works in the ToolBelt phone app. In the browser, use Card instead.');
  }, []);
  return { charge, status: null as string | null };
}
