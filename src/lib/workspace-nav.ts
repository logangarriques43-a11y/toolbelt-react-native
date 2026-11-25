/**
 * Every area of the app a business can open, with the permission that gates
 * it. The phone dashboard lists these under "Workspace"; the desktop sidebar
 * (components/desktop-shell.web.tsx) shows the same list, so the two can't
 * drift apart.
 */

import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

import type { Permission } from '@/models/permission';

export interface WorkspaceItem {
  icon: SFSymbol;
  title: string;
  route: Href;
  permission?: Permission;
}

/** Every destination the old tile grid and Quick Actions list had. */
export const WORKSPACE: WorkspaceItem[] = [
  { icon: 'calendar', title: 'Calendar', route: '/appointments', permission: 'viewAppointments' },
  // Invoices ship in v1. Give them a direct tile so they aren't only reachable
  // via Finances, which is gated behind viewReports (off for this build).
  { icon: 'doc.text.magnifyingglass', title: 'Invoices', route: '/accounting/invoices', permission: 'viewInvoices' },
  { icon: 'creditcard.fill', title: 'Payments', route: '/payments', permission: 'viewPayments' },
  { icon: 'dollarsign.circle.fill', title: 'Finances', route: '/accounting', permission: 'viewReports' },
  { icon: 'shippingbox.fill', title: 'Inventory', route: '/inventory', permission: 'viewInventory' },
  { icon: 'storefront.fill', title: 'Vendor marketplace', route: '/vending', permission: 'viewVendors' },
  { icon: 'megaphone.fill', title: 'Marketing', route: '/marketing', permission: 'viewMarketing' },
  { icon: 'sparkles', title: 'Special features', route: '/special-features' },
  { icon: 'paintbrush.fill', title: 'Custom website design', route: '/custom-website' },
  { icon: 'chart.bar.fill', title: 'Analytics', route: '/analytics', permission: 'viewAnalytics' },
  { icon: 'questionmark.circle.fill', title: 'Help', route: '/help' },
  { icon: 'gearshape.fill', title: 'Settings', route: '/settings', permission: 'manageSettings' },
];
