/**
 * Vendor marketplace layout — gates the whole module.
 *
 * The vending screens (dashboard, discovery, detail, products, register) are
 * all part of the Vendor marketplace module, which isn't shipping in v1
 * (feature-flags). Guarding here covers every vending route — including deep
 * links and stale navigation — with a single check, instead of wrapping each
 * screen. If `viewVendors` is denied, RequirePermission redirects home.
 */

import { Stack } from 'expo-router';

import { RequirePermission } from '@/components/require-permission';

export default function VendingLayout() {
  return (
    <RequirePermission permission="viewVendors">
      <Stack screenOptions={{ headerShown: false }} />
    </RequirePermission>
  );
}
