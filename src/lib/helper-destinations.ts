/**
 * AI helper destinations — the screen keys `POST /helper/chat` may answer with
 * (HELPER_SCREENS in the backend's helperService.js), mapped to RN routes.
 *
 * Keys with no RN screen yet map to `null` and are reported to the server as
 * `unavailableScreens`, so the model doesn't offer them. A `permission` hides
 * the key for anyone who can't open it (including modules gated off in this
 * build by FeatureFlags).
 */

import type { Href } from 'expo-router';

import type { Permission } from '@/models/permission';

interface Destination {
  route: Href | null;
  permission?: Permission;
}

export const HELPER_DESTINATIONS: Record<string, Destination> = {
  schedule: { route: '/appointments', permission: 'viewAppointments' },
  services: { route: '/services' },
  addService: { route: '/services/new' },
  clients: { route: '/clients', permission: 'viewClients' },
  addClient: { route: '/clients/new', permission: 'editClients' },
  createAppointment: { route: '/appointments/create', permission: 'editAppointments' },
  payments: { route: '/payments', permission: 'viewPayments' },
  payoutStatus: { route: '/payout', permission: 'manageSettings' },
  securitySettings: { route: '/security' },
  accounting: { route: '/accounting', permission: 'viewReports' },
  timeOff: { route: '/time-off', permission: 'viewTimeOff' },
  timeOffRequests: { route: null },
  createInvoice: { route: '/accounting/create-invoice', permission: 'sendInvoices' },
  invoiceList: { route: '/accounting/invoices', permission: 'viewInvoices' },
  reports: { route: '/accounting/reports', permission: 'viewReports' },
  transactionList: { route: '/accounting/transactions', permission: 'viewPayments' },
  financialOverview: { route: '/accounting/financial-overview', permission: 'viewReports' },
  taxDashboard: { route: '/accounting/tax', permission: 'viewTaxAndExpenses' },
  recordExpense: { route: '/accounting/record-expense', permission: 'manageTaxAndExpenses' },
  expenseList: { route: '/accounting/expenses', permission: 'viewTaxAndExpenses' },
  taxAIAnalysis: { route: '/accounting/tax-analysis', permission: 'viewTaxAndExpenses' },
  messages: { route: '/messages', permission: 'viewMessages' },
  messageSettings: { route: '/messages-settings', permission: 'manageSettings' },
  inventory: { route: '/inventory', permission: 'viewInventory' },
  staff: { route: '/staff', permission: 'manageStaff' },
  importData: { route: '/import-data', permission: 'manageSettings' },
  googleCalendarConnection: { route: null },
  waitlist: { route: null },
  onlineBooking: { route: '/online-booking', permission: 'manageOnlineBooking' },
  bookingPagePreview: { route: '/online-booking', permission: 'viewOnlineBooking' },
  smsSetup: { route: '/sms-setup', permission: 'manageSettings' },
  smsConversations: { route: '/sms-conversations', permission: 'viewMessages' },
  vendorDashboard: { route: '/vending', permission: 'viewVendors' },
  vendorDiscovery: { route: '/vending/discovery', permission: 'viewVendors' },
  marketing: { route: '/marketing', permission: 'viewMarketing' },
  emailCampaignsHub: { route: null },
  marketingAnalytics: { route: null },
  googleAnalyticsConnection: { route: null },
  emailContacts: { route: null },
  importEmailContacts: { route: null },
  emailTemplates: { route: null },
  emailCampaigns: { route: null },
  createEmailCampaign: { route: null },
  specialFeatures: { route: '/special-features' },
  customWebsite: { route: '/custom-website' },
  requestQuote: { route: '/request-quote' },
  help: { route: '/help' },
  analytics: { route: '/analytics', permission: 'viewAnalytics' },
  settings: { route: '/settings', permission: 'manageSettings' },
  apiKeys: { route: null },
  myStaffProfile: { route: null },
  appointmentCleanup: { route: null },
  search: { route: '/appointments/search', permission: 'viewAppointments' },
};

/** Keys this user can't open: no RN screen, or a permission they lack. */
export function unavailableScreens(can: (p: Permission) => boolean): string[] {
  return Object.entries(HELPER_DESTINATIONS)
    .filter(([, d]) => d.route === null || (d.permission !== undefined && !can(d.permission)))
    .map(([key]) => key);
}
