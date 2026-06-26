/**
 * Payment feature catalog — port of the FeatureItem/FeatureCategory data in
 * PaymentTabViews.swift (and the PaymentFeatureId set FeatureSetupManager keys on).
 * The 22 features the Payments → Features tab lists across four categories.
 * Each feature's bespoke setup flow (GiftCardsView, PaymentRemindersView, …) is
 * deferred — the Features tab shows the catalog + a generic enable/disable sheet.
 */

import type { SFSymbol } from 'expo-symbols';

export type PaymentFeatureId =
  | 'tapToPay'
  | 'qrCodePayments'
  | 'digitalWallets'
  | 'offlinePayments'
  | 'splitPayments'
  | 'paymentLinks'
  | 'invoicing'
  | 'recurringPayments'
  | 'virtualTerminal'
  | 'onlineCheckout'
  | 'giftCards'
  | 'loyaltyProgram'
  | 'discountsPromos'
  | 'tipping'
  | 'buyNowPayLater'
  | 'customerDirectory'
  | 'salesReports'
  | 'digitalReceipts'
  | 'paymentReminders'
  | 'disputeManagement'
  | 'fastDeposits'
  | 'taxReporting';

export interface PaymentFeature {
  id: PaymentFeatureId;
  icon: SFSymbol;
  name: string;
  description: string;
}

export interface PaymentFeatureCategory {
  title: string;
  icon: SFSymbol;
  color: string;
  features: PaymentFeature[];
}

export const FEATURE_CATEGORIES: PaymentFeatureCategory[] = [
  {
    title: 'Accept Payments',
    icon: 'wave.3.right',
    color: '#33C773',
    features: [
      { id: 'tapToPay', icon: 'wave.3.right', name: 'Tap to Pay', description: 'Accept contactless cards and digital wallets with just your iPhone' },
      { id: 'qrCodePayments', icon: 'qrcode.viewfinder', name: 'QR Code Payments', description: 'Let customers scan and pay instantly from their phone' },
      { id: 'digitalWallets', icon: 'wallet.pass.fill', name: 'Digital Wallets', description: 'Accept Apple Pay, Google Pay, and Cash App Pay' },
      { id: 'offlinePayments', icon: 'wifi.slash', name: 'Offline Payments', description: 'Keep accepting sales even without internet for up to 24 hours' },
      { id: 'splitPayments', icon: 'dollarsign.arrow.circlepath', name: 'Split Payments', description: 'Let customers split a bill across multiple cards or methods' },
    ],
  },
  {
    title: 'Remote Payments',
    icon: 'paperplane.fill',
    color: '#6680F2',
    features: [
      { id: 'paymentLinks', icon: 'link', name: 'Payment Links', description: 'Send a pay link via text or email to collect payment remotely' },
      { id: 'invoicing', icon: 'doc.text.fill', name: 'Invoicing', description: 'Send professional invoices with automatic payment reminders' },
      { id: 'recurringPayments', icon: 'arrow.triangle.2.circlepath', name: 'Recurring Payments', description: 'Set up automatic billing for regular clients and subscriptions' },
      { id: 'virtualTerminal', icon: 'keyboard', name: 'Virtual Terminal', description: 'Key in card numbers manually for phone and mail orders' },
      { id: 'onlineCheckout', icon: 'cart.fill', name: 'Online Checkout', description: 'Add a checkout button to your website or online store' },
    ],
  },
  {
    title: 'Customer Engagement',
    icon: 'person.2.fill',
    color: '#F29933',
    features: [
      { id: 'giftCards', icon: 'giftcard.fill', name: 'Gift Cards', description: 'Sell digital and physical gift cards for your business' },
      { id: 'loyaltyProgram', icon: 'star.fill', name: 'Loyalty Program', description: 'Reward repeat customers with points, perks, and milestones' },
      { id: 'discountsPromos', icon: 'percent', name: 'Discounts & Promos', description: 'Create promo codes, daily specials, and limited-time offers' },
      { id: 'tipping', icon: 'hand.thumbsup.fill', name: 'Tipping', description: 'Customizable tip presets on screen and printed receipts' },
      { id: 'buyNowPayLater', icon: 'calendar.badge.clock', name: 'Buy Now, Pay Later', description: 'Let customers pay in installments with Afterpay' },
      { id: 'customerDirectory', icon: 'person.crop.rectangle.fill', name: 'Customer Directory', description: 'Build profiles with purchase history and preferences' },
    ],
  },
  {
    title: 'Business Tools',
    icon: 'chart.bar.fill',
    color: '#9966E6',
    features: [
      { id: 'salesReports', icon: 'chart.bar.fill', name: 'Sales Reports', description: 'Detailed real-time analytics and insights on your revenue' },
      { id: 'digitalReceipts', icon: 'envelope.fill', name: 'Digital Receipts', description: 'Send branded receipts via email or text message' },
      { id: 'paymentReminders', icon: 'bell.badge.fill', name: 'Payment Reminders', description: 'Auto-remind clients of pending or overdue payments' },
      { id: 'disputeManagement', icon: 'exclamationmark.shield.fill', name: 'Dispute Management', description: 'Track and manage chargebacks and payment disputes' },
      { id: 'fastDeposits', icon: 'banknote.fill', name: 'Fast Deposits', description: 'Get your funds deposited as fast as next business day' },
      { id: 'taxReporting', icon: 'doc.richtext.fill', name: 'Tax Reporting', description: 'Automatic tax calculations and end-of-year summaries' },
    ],
  },
];
