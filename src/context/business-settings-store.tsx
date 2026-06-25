/**
 * Business-settings store — in-session state for the Settings hub + child
 * screens (the RN stand-in for the UserDefaults the SwiftUI screens used).
 * Persistence to device storage is deferred.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { EMPTY_ADDRESS, type BusinessAddress } from '@/models/business-settings';

export interface BusinessSettingsState {
  reminderHours: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  aiAutoReply: boolean;
  address: BusinessAddress;
}

export interface BusinessSettingsStore extends BusinessSettingsState {
  set: <K extends keyof BusinessSettingsState>(key: K, value: BusinessSettingsState[K]) => void;
}

const INITIAL: BusinessSettingsState = {
  reminderHours: 24,
  pushEnabled: false,
  emailEnabled: true,
  smsEnabled: true,
  aiAutoReply: true,
  address: EMPTY_ADDRESS,
};

const BusinessSettingsContext = createContext<BusinessSettingsStore | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BusinessSettingsState>(INITIAL);

  const value = useMemo<BusinessSettingsStore>(
    () => ({
      ...state,
      set: (key, val) => setState((prev) => ({ ...prev, [key]: val })),
    }),
    [state],
  );

  return <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>;
}

export function useBusinessSettings(): BusinessSettingsStore {
  const ctx = useContext(BusinessSettingsContext);
  if (!ctx) throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
  return ctx;
}
