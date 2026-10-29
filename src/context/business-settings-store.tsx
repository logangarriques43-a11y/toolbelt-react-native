/**
 * Business-settings store — state for the Settings hub + child screens (the RN
 * stand-in for the UserDefaults the SwiftUI screens used).
 *
 * Persisted to the backend `appSettings` blob (api/app-settings.ts), the same
 * one iOS syncs, so a setting changed on either app follows the account. Like
 * Swift BusinessSettingsSync, the server copy is loaded once per session and
 * local edits win after that; edits are pushed after a short debounce. Push
 * notifications aren't in the blob, so that toggle is kept on the device.
 * Reminder Timing is also the default reminder for new in-app appointments,
 * and AI Auto-Reply also flips the server's AI texting switch (/ai-responder).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { loadAppSettings, saveAppSettings, type AppSettingsBlob } from '@/api/app-settings';
import { api } from '@/lib/api-client';
import { setDefaultReminderMinutes } from '@/lib/appointment-defaults';
import { USER_DATA_KEYS } from '@/lib/user-data-keys';
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

const PUSH_KEY = USER_DATA_KEYS.pushEnabled;
const SAVE_DELAY_MS = 800;

function fromBlob(prev: BusinessSettingsState, b: AppSettingsBlob): BusinessSettingsState {
  return {
    ...prev,
    reminderHours: b.reminderTimingHours ?? prev.reminderHours,
    emailEnabled: b.notifEmail ?? prev.emailEnabled,
    smsEnabled: b.notifSms ?? prev.smsEnabled,
    aiAutoReply: b.aiAutoReply ?? prev.aiAutoReply,
    address: {
      street: b.addressStreet ?? prev.address.street,
      apt: b.addressApt ?? prev.address.apt,
      city: b.addressCity ?? prev.address.city,
      state: b.addressState ?? prev.address.state,
      zip: b.addressZip ?? prev.address.zip,
      country: b.addressCountry ?? prev.address.country,
    },
  };
}

function toBlob(s: BusinessSettingsState): AppSettingsBlob {
  return {
    addressStreet: s.address.street,
    addressApt: s.address.apt,
    addressCity: s.address.city,
    addressState: s.address.state,
    addressZip: s.address.zip,
    addressCountry: s.address.country,
    reminderTimingHours: s.reminderHours,
    notifEmail: s.emailEnabled,
    notifSms: s.smsEnabled,
    aiAutoReply: s.aiAutoReply,
  };
}

const BusinessSettingsContext = createContext<BusinessSettingsStore | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BusinessSettingsState>(INITIAL);
  const edited = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PUSH_KEY)
      .then((v) => {
        if (v !== null) setState((prev) => ({ ...prev, pushEnabled: v === 'true' }));
      })
      .catch(() => {});
    loadAppSettings()
      .then((blob) => {
        if (!blob || edited.current) return;
        if (blob.reminderTimingHours != null) setDefaultReminderMinutes(blob.reminderTimingHours * 60);
        setState((prev) => fromBlob(prev, blob));
      })
      .catch(() => {});
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const value = useMemo<BusinessSettingsStore>(
    () => ({
      ...state,
      set: (key, val) => {
        edited.current = true;
        setState((prev) => {
          const next = { ...prev, [key]: val };
          if (key === 'reminderHours') setDefaultReminderMinutes((val as number) * 60);
          // AI auto-reply is also the server's AI texting switch.
          if (key === 'aiAutoReply') api.patch('/ai-responder', { enabled: val }).catch(() => {});
          if (key === 'pushEnabled') {
            AsyncStorage.setItem(PUSH_KEY, String(val)).catch(() => {});
          } else {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
              saveAppSettings(toBlob(next)).catch(() => {});
            }, SAVE_DELAY_MS);
          }
          return next;
        });
      },
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
