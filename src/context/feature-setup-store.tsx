/**
 * Feature setup store — RN counterpart to FeatureSetupManager.swift.
 * Tracks which Payments features the owner has enabled. In-memory only (the
 * Swift build also persists per-feature settings + backend-syncs them — deferred).
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PaymentFeatureId } from '@/models/payment-feature';

export interface FeatureSetupStore {
  isEnabled: (id: PaymentFeatureId) => boolean;
  enable: (id: PaymentFeatureId) => void;
  disable: (id: PaymentFeatureId) => void;
  toggle: (id: PaymentFeatureId) => void;
}

const FeatureSetupContext = createContext<FeatureSetupStore | null>(null);

export function FeatureSetupProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Set<PaymentFeatureId>>(() => new Set());

  const value = useMemo<FeatureSetupStore>(
    () => ({
      isEnabled: (id) => enabled.has(id),
      enable: (id) =>
        setEnabled((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        }),
      disable: (id) =>
        setEnabled((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      toggle: (id) =>
        setEnabled((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    }),
    [enabled],
  );

  return <FeatureSetupContext.Provider value={value}>{children}</FeatureSetupContext.Provider>;
}

export function useFeatureSetup(): FeatureSetupStore {
  const ctx = useContext(FeatureSetupContext);
  if (!ctx) throw new Error('useFeatureSetup must be used within a FeatureSetupProvider');
  return ctx;
}
