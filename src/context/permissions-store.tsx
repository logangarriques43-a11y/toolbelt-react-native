/**
 * Permissions store — RN counterpart to PermissionsManager.swift.
 *
 * Fail-closed: until a session is explicitly configured (owner or staff), every
 * check is denied. The authenticated layout configures it from the session:
 * owners pass everything, staff are gated by the map from GET /staff/me. The
 * setters are stable so the layout can re-configure whenever the map changes.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { gatedOff } from '@/lib/feature-flags';
import type { Permission, PermissionRole } from '@/models/permission';

export interface PermissionsStore {
  role: PermissionRole;
  /** Owner accounts pass every check. */
  configureAsOwner: () => void;
  /** Staff accounts are gated by this map (missing key = denied). */
  configureAsStaff: (permissions: Record<string, boolean>) => void;
  /** Wipe to the deny-all `unconfigured` state (sign-out). */
  reset: () => void;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
}

const PermissionsContext = createContext<PermissionsStore | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<PermissionRole>('unconfigured');
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});

  const configureAsOwner = useCallback(() => {
    setRole('owner');
    setPermissionMap({});
  }, []);
  const configureAsStaff = useCallback((permissions: Record<string, boolean>) => {
    setRole('staff');
    setPermissionMap(permissions);
  }, []);
  const reset = useCallback(() => {
    setRole('unconfigured');
    setPermissionMap({});
  }, []);

  const value = useMemo<PermissionsStore>(() => {
    const can = (permission: Permission): boolean => {
      // Build-time feature gating wins over role: a module not shipping this
      // build is hidden for everyone (owner included).
      if (gatedOff(permission)) return false;
      switch (role) {
        case 'owner': return true;
        case 'staff': return permissionMap[permission] === true;
        case 'unconfigured': return false;
      }
    };
    return {
      role,
      configureAsOwner,
      configureAsStaff,
      reset,
      can,
      canAny: (permissions) => permissions.some(can),
      canAll: (permissions) => permissions.every(can),
    };
  }, [role, permissionMap, configureAsOwner, configureAsStaff, reset]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsStore {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within a PermissionsProvider');
  return ctx;
}
