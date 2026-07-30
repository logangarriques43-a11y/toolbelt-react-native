/**
 * Permission catalog — port of Permission / PermissionRole (PermissionsManager.swift).
 *
 * Every per-staff capability the owner can grant. Staff sessions are gated by a
 * `Record<Permission, boolean>` map (missing key = denied); owners pass every
 * check. Keep the order in sync with the Swift enum — the editor renders in
 * this order.
 */

import type { SFSymbol } from 'expo-symbols';

export type Permission =
  | 'viewClients' | 'editClients'
  | 'viewAppointments' | 'editAppointments'
  | 'viewPayments' | 'processPayments' | 'viewInvoices' | 'sendInvoices'
  | 'viewReports' | 'viewAnalytics'
  | 'viewInventory' | 'manageInventory'
  | 'viewMarketing' | 'manageMarketing'
  | 'viewOnlineBooking' | 'manageOnlineBooking'
  | 'viewVendors' | 'manageVendors'
  | 'viewMessages' | 'sendMessages'
  | 'viewTaxAndExpenses' | 'manageTaxAndExpenses'
  | 'viewTimeOff' | 'manageTimeOff'
  | 'manageSettings'
  | 'manageStaff'
  | 'viewStaffSchedules'
  | 'manageOwnWorkingHours';

/** Every permission, in the Swift `Permission.allCases` order. */
export const PERMISSIONS: Permission[] = [
  'viewClients', 'editClients',
  'viewAppointments', 'editAppointments',
  'viewPayments', 'processPayments', 'viewInvoices', 'sendInvoices',
  'viewReports', 'viewAnalytics',
  'viewInventory', 'manageInventory',
  'viewMarketing', 'manageMarketing',
  'viewOnlineBooking', 'manageOnlineBooking',
  'viewVendors', 'manageVendors',
  'viewMessages', 'sendMessages',
  'viewTaxAndExpenses', 'manageTaxAndExpenses',
  'viewTimeOff', 'manageTimeOff',
  'manageSettings',
  'manageStaff',
  'viewStaffSchedules',
  'manageOwnWorkingHours',
];

const TITLES: Record<Permission, string> = {
  viewClients: 'View Clients', editClients: 'Edit Clients',
  viewAppointments: 'View Appointments', editAppointments: 'Edit Appointments',
  viewPayments: 'View Payments', processPayments: 'Process Payments',
  viewInvoices: 'View Invoices', sendInvoices: 'Send Invoices',
  viewReports: 'View Reports', viewAnalytics: 'View Analytics',
  viewInventory: 'View Inventory', manageInventory: 'Manage Inventory',
  viewMarketing: 'View Marketing', manageMarketing: 'Manage Marketing',
  viewOnlineBooking: 'View Online Booking', manageOnlineBooking: 'Manage Online Booking',
  viewVendors: 'View Vendors', manageVendors: 'Manage Vendors',
  viewMessages: 'View Messages', sendMessages: 'Send Messages',
  viewTaxAndExpenses: 'View Tax & Expenses', manageTaxAndExpenses: 'Manage Tax & Expenses',
  viewTimeOff: 'View Time Off', manageTimeOff: 'Manage Time Off',
  manageSettings: 'Manage Settings',
  manageStaff: 'Manage Staff',
  viewStaffSchedules: 'View Staff Schedules',
  manageOwnWorkingHours: 'Set Own Working Hours',
};

const SUBTITLES: Record<Permission, string> = {
  viewClients: 'See client list and details', editClients: 'Add, edit, or remove clients',
  viewAppointments: 'See the schedule and bookings', editAppointments: 'Create, edit, or cancel appointments',
  viewPayments: 'See transaction history and income', processPayments: 'Charge clients and issue refunds',
  viewInvoices: 'See sent and pending invoices', sendInvoices: 'Create and send invoices to clients',
  viewReports: 'Access business reports', viewAnalytics: 'View analytics dashboards',
  viewInventory: 'See products and stock levels', manageInventory: 'Add or edit products and stock',
  viewMarketing: 'See campaigns and email lists', manageMarketing: 'Create campaigns, edit lists, send emails',
  viewOnlineBooking: 'See the public booking page setup', manageOnlineBooking: 'Edit the public booking page',
  viewVendors: 'Browse vendors', manageVendors: 'Register or edit vendor accounts',
  viewMessages: 'Read SMS conversations', sendMessages: 'Send SMS to clients',
  viewTaxAndExpenses: 'See tax dashboard and expense history', manageTaxAndExpenses: 'Record expenses and run tax actions',
  viewTimeOff: 'See scheduled time-off', manageTimeOff: 'Add or remove time-off entries',
  manageSettings: 'Change business settings',
  manageStaff: 'Add, edit, or remove staff members',
  viewStaffSchedules: 'See other staff and view their schedules',
  manageOwnWorkingHours: 'Set and change their own working hours',
};

const ICONS: Record<Permission, SFSymbol> = {
  viewClients: 'person.2.fill', editClients: 'person.2.fill',
  viewAppointments: 'calendar', editAppointments: 'calendar',
  viewPayments: 'dollarsign.circle.fill', processPayments: 'dollarsign.circle.fill',
  viewInvoices: 'doc.text.fill', sendInvoices: 'doc.text.fill',
  viewReports: 'chart.bar.fill', viewAnalytics: 'chart.bar.fill',
  viewInventory: 'shippingbox.fill', manageInventory: 'shippingbox.fill',
  viewMarketing: 'megaphone.fill', manageMarketing: 'megaphone.fill',
  viewOnlineBooking: 'globe', manageOnlineBooking: 'globe',
  viewVendors: 'cart.fill', manageVendors: 'cart.fill',
  viewMessages: 'bubble.left.and.bubble.right.fill', sendMessages: 'bubble.left.and.bubble.right.fill',
  viewTaxAndExpenses: 'percent', manageTaxAndExpenses: 'percent',
  viewTimeOff: 'clock.fill', manageTimeOff: 'clock.fill',
  manageSettings: 'gearshape.fill',
  manageStaff: 'person.crop.circle.badge.checkmark',
  viewStaffSchedules: 'person.2.fill',
  manageOwnWorkingHours: 'clock.fill',
};

export function permissionTitle(p: Permission): string { return TITLES[p]; }
export function permissionSubtitle(p: Permission): string { return SUBTITLES[p]; }
export function permissionIcon(p: Permission): SFSymbol { return ICONS[p]; }

/**
 * `owner` passes every check; `staff` is gated by the permission map;
 * `unconfigured` denies everything (fail-closed default + post-sign-out state).
 */
export type PermissionRole = 'owner' | 'staff' | 'unconfigured';
