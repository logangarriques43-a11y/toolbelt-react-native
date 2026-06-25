/**
 * Appointment form context — RN counterpart to AppointmentFormViewModel.
 * Holds the in-progress selection/time state shared across the create flow
 * (CreateAppointment ⇄ SelectClient / SelectService), which in SwiftUI were
 * @Binding values threaded through the Router.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Client } from '@/models/client';
import type { Service } from '@/models/service';

export interface AppointmentFormState {
  selectedClient: Client | null;
  selectedService: Service | null;
  appointmentDate: string; // ISO
  startHour: number;
  startMinute: number;
  startIsPM: boolean;
  endHour: number;
  endMinute: number;
  endIsPM: boolean;
  staffMemberId: string | null;
}

export interface AppointmentForm extends AppointmentFormState {
  setSelectedClient: (c: Client | null) => void;
  setSelectedService: (s: Service | null) => void;
  setAppointmentDate: (iso: string) => void;
  setStart: (hour: number, minute: number, isPM: boolean) => void;
  setEnd: (hour: number, minute: number, isPM: boolean) => void;
  reset: () => void;
}

function initialState(): AppointmentFormState {
  return {
    selectedClient: null,
    selectedService: null,
    appointmentDate: new Date().toISOString(),
    startHour: 9,
    startMinute: 0,
    startIsPM: false,
    endHour: 10,
    endMinute: 0,
    endIsPM: false,
    staffMemberId: null,
  };
}

const AppointmentFormContext = createContext<AppointmentForm | null>(null);

export function AppointmentFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppointmentFormState>(initialState);

  const value = useMemo<AppointmentForm>(
    () => ({
      ...state,
      setSelectedClient: (selectedClient) => setState((s) => ({ ...s, selectedClient })),
      setSelectedService: (selectedService) => setState((s) => ({ ...s, selectedService })),
      setAppointmentDate: (appointmentDate) => setState((s) => ({ ...s, appointmentDate })),
      setStart: (startHour, startMinute, startIsPM) =>
        setState((s) => ({ ...s, startHour, startMinute, startIsPM })),
      setEnd: (endHour, endMinute, endIsPM) =>
        setState((s) => ({ ...s, endHour, endMinute, endIsPM })),
      reset: () => setState(initialState()),
    }),
    [state],
  );

  return (
    <AppointmentFormContext.Provider value={value}>{children}</AppointmentFormContext.Provider>
  );
}

export function useAppointmentForm(): AppointmentForm {
  const ctx = useContext(AppointmentFormContext);
  if (!ctx) throw new Error('useAppointmentForm must be used within an AppointmentFormProvider');
  return ctx;
}
