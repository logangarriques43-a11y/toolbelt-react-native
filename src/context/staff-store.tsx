/**
 * Staff store — backed by the real backend via React Query (was in-memory).
 *
 * List from `GET /staff` (cached, invalidated on mutation); create/update/delete
 * POST/PUT/DELETE. Same public API, but mutations are async. The business owner
 * is a real /staff row (isOwner=true) — `ensureOwnerExists` creates it once from
 * the account if the backend has no owner yet (mirrors StaffManager). For an
 * account that already used the Swift app, the owner comes back from /staff.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { createStaff, deleteStaff as apiDeleteStaff, listStaff, updateStaff as apiUpdateStaff } from '@/api/staff';
import { useSession } from '@/context/session';
import type { StaffMember } from '@/models/staff';

export const STAFF_QUERY_KEY = ['staff'] as const;

export interface StaffStore {
  staff: StaffMember[];
  isLoading: boolean;
  error: unknown;
  addStaff: (m: Omit<StaffMember, 'id'>) => Promise<StaffMember>;
  updateStaff: (m: StaffMember) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  findStaff: (id: string) => StaffMember | undefined;
  searchStaff: (query: string) => StaffMember[];
}

const StaffContext = createContext<StaffStore | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { account } = useSession();
  const { data, isLoading, isSuccess, error } = useQuery({ queryKey: STAFF_QUERY_KEY, queryFn: listStaff });
  const staff = useMemo(() => data ?? [], [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
  const createMut = useMutation({ mutationFn: createStaff, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: apiUpdateStaff, onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: apiDeleteStaff, onSuccess: invalidate });

  // ensureOwnerExists — once the roster has loaded, if the backend has no owner
  // row, create one from the account (new business). Guarded so it fires once.
  const ensuredOwner = useRef(false);
  useEffect(() => {
    if (!isSuccess || ensuredOwner.current || !account) return;
    if (staff.some((m) => m.isOwner)) return;
    ensuredOwner.current = true;
    createMut.mutate({
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
    });
  }, [isSuccess, staff, account, createMut]);

  const value = useMemo<StaffStore>(
    () => ({
      staff,
      isLoading,
      error,
      addStaff: (m) => createMut.mutateAsync(m),
      updateStaff: async (m) => {
        await updateMut.mutateAsync(m);
      },
      deleteStaff: async (id) => {
        await deleteMut.mutateAsync(id);
      },
      findStaff: (id) => staff.find((it) => it.id === id),
      searchStaff: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
      },
    }),
    [staff, isLoading, error, createMut, updateMut, deleteMut],
  );

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffStore {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within a StaffProvider');
  return ctx;
}
