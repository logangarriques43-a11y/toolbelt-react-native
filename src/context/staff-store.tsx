/**
 * Staff store — RN counterpart to StaffManager.swift.
 * In-memory CRUD + search; backend sync deferred. Auto-seeds the business owner
 * from the signed-in account (ensureOwnerExists) on first mount.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/session';
import { uuid } from '@/lib/id';
import type { StaffMember } from '@/models/staff';

export interface StaffStore {
  staff: StaffMember[];
  addStaff: (m: Omit<StaffMember, 'id'>) => void;
  updateStaff: (m: StaffMember) => void;
  deleteStaff: (id: string) => void;
  findStaff: (id: string) => StaffMember | undefined;
  searchStaff: (query: string) => StaffMember[];
}

const StaffContext = createContext<StaffStore | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const { account } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // ensureOwnerExists — add the owner once, derived from the account.
  useEffect(() => {
    if (!account) return;
    setStaff((prev) => {
      if (prev.some((m) => m.isOwner)) return prev;
      const owner: StaffMember = {
        id: uuid(),
        name: account.name,
        role: 'Owner',
        phoneNumber: '',
        email: account.email,
        isActive: true,
        isOwner: true,
        assignedServiceIds: [],
        colorHex: '',
        lunchBreaks: [],
        workingHours: [],
      };
      return [owner, ...prev];
    });
  }, [account]);

  const value = useMemo<StaffStore>(
    () => ({
      staff,
      addStaff: (m) => setStaff((prev) => [...prev, { ...m, id: uuid() }]),
      updateStaff: (m) => setStaff((prev) => prev.map((it) => (it.id === m.id ? m : it))),
      deleteStaff: (id) => setStaff((prev) => prev.filter((it) => it.id !== id)),
      findStaff: (id) => staff.find((it) => it.id === id),
      searchStaff: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter(
          (m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q),
        );
      },
    }),
    [staff],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffStore {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within a StaffProvider');
  return ctx;
}
