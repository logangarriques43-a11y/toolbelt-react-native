/**
 * RequirePermission — route guard for a gated screen.
 *
 * Wrap a screen's content in this; if `can(permission)` is false (the viewer
 * lacks it, or the whole module is gated off for this build via
 * src/lib/feature-flags.ts), it redirects to the home grid instead of
 * rendering. This stops a deep link or stale navigation from opening a module
 * that isn't shipping yet — the single shared guard per AGENTS.md, so there are
 * no copy-pasted redirect blocks across the gated route files.
 */

import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { usePermissions } from '@/context/permissions-store';
import type { Permission } from '@/models/permission';

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  if (!can(permission)) return <Redirect href="/" />;
  return <>{children}</>;
}
