/**
 * AsyncStorage keys that hold ONE signed-in account's data but aren't scoped by
 * uid. The session clears all of them when a user signs out, so the next
 * person on the same phone never sees the previous account's data.
 *
 * Adding per-account data to AsyncStorage? Either put the uid in the key or
 * add the key here. Device-wide preferences (theme, appointment default
 * length) don't belong here.
 */
export const USER_DATA_KEYS = {
  vendorFavorites: 'vendors.favorites',
  inventoryActivity: 'inventory.activityHistory',
  paymentFeatures: 'paymentFeatures.enabled',
  pushEnabled: 'notif.push',
  terminalLocation: 'stripe.terminal.locationId',
} as const;
