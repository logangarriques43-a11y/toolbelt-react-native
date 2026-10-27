/**
 * Feature setup store — RN counterpart to FeatureSetupManager.swift.
 * Tracks which Payments features the owner has enabled, kept on the device in
 * AsyncStorage (iOS keeps the same state in UserDefaults; its `/features`
 * backend sync has no server route, so there is nothing to sync to yet).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { PaymentFeatureId } from '@/models/payment-feature';

const STORAGE_KEY = 'paymentFeatures.enabled';

export interface FeatureSetupStore {
  isEnabled: (id: PaymentFeatureId) => boolean;
  enable: (id: PaymentFeatureId) => void;
  disable: (id: PaymentFeatureId) => void;
  toggle: (id: PaymentFeatureId) => void;
}

const FeatureSetupContext = createContext<FeatureSetupStore | null>(null);

export function FeatureSetupProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Set<PaymentFeatureId>>(() => new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!v) return;
        const ids = JSON.parse(v);
        if (Array.isArray(ids)) setEnabled(new Set(ids as PaymentFeatureId[]));
      })
      .catch(() => {});
  }, []);

  const value = useMemo<FeatureSetupStore>(() => {
    const update = (change: (next: Set<PaymentFeatureId>) => void) =>
      setEnabled((prev) => {
        const next = new Set(prev);
        change(next);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    return {
      isEnabled: (id) => enabled.has(id),
      enable: (id) => update((next) => next.add(id)),
      disable: (id) => update((next) => next.delete(id)),
      toggle: (id) => update((next) => (next.has(id) ? next.delete(id) : next.add(id))),
    };
  }, [enabled]);

  return <FeatureSetupContext.Provider value={value}>{children}</FeatureSetupContext.Provider>;
}

export function useFeatureSetup(): FeatureSetupStore {
  const ctx = useContext(FeatureSetupContext);
  if (!ctx) throw new Error('useFeatureSetup must be used within a FeatureSetupProvider');
  return ctx;
}
