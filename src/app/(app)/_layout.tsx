import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { AccountingProvider } from '@/context/accounting-store';
import { AppointmentFormProvider } from '@/context/appointment-form';
import { AppointmentsProvider } from '@/context/appointments-store';
import { BusinessSettingsProvider } from '@/context/business-settings-store';
import { ClientsProvider } from '@/context/clients-store';
import { ExpensesProvider } from '@/context/expenses-store';
import { FeatureSetupProvider } from '@/context/feature-setup-store';
import { InventoryProvider } from '@/context/inventory-store';
import { InvoicesProvider } from '@/context/invoices-store';
import { PermissionsProvider, usePermissions } from '@/context/permissions-store';
import { ProductsProvider } from '@/context/products-store';
import { SalesProvider } from '@/context/sales-store';
import { ServicesProvider } from '@/context/services-store';
import { SMSProvider } from '@/context/sms-store';
import { StaffProvider } from '@/context/staff-store';
import { TimeOffProvider } from '@/context/time-off-store';
import { VendorProvider } from '@/context/vendor-store';
import { WorkingHoursProvider } from '@/context/working-hours-store';
import { useSession } from '@/context/session';
import { onTwoFactorRequired } from '@/lib/api-client';

/**
 * Authenticated stack (owner or staff). Dashboard hub + feature screens.
 * Data stores (clients, services, appointments, staff, …) are scoped to the signed-in area.
 */

/**
 * Configures the permission session from the auth session: owners pass every
 * check; staff are gated by their permission map from GET /staff/me (cached per
 * uid for offline launches; missing key = denied).
 */
function SessionPermissionsConfig() {
  const { role, staff } = useSession();
  const { configureAsOwner, configureAsStaff, reset } = usePermissions();
  const permissions = staff?.permissions;
  useEffect(() => {
    if (role === 'owner') configureAsOwner();
    else if (role === 'staff') configureAsStaff(permissions ?? {});
    else reset();
  }, [role, permissions, configureAsOwner, configureAsStaff, reset]);
  return null;
}

/**
 * When any request is refused with `2fa_required` (the backend enforces
 * two-step sign-in on payments, payouts, tax, clients…), explain once and offer
 * the Security screen. Further refusals while the alert is up are ignored.
 */
function TwoFactorRequiredAlert() {
  const router = useRouter();
  const showing = useRef(false);
  useEffect(
    () =>
      onTwoFactorRequired(() => {
        if (showing.current) return;
        showing.current = true;
        const done = () => {
          showing.current = false;
        };
        Alert.alert(
          'Two-step sign-in required',
          'This part of ToolBelt needs a session that passed two-step sign-in. Set up an authenticator app in Security, then sign out and sign back in with your code.',
          [
            { text: 'Not Now', style: 'cancel', onPress: done },
            {
              text: 'Open Security',
              onPress: () => {
                done();
                router.push('/security');
              },
            },
          ],
          { cancelable: true, onDismiss: done },
        );
      }),
    [router],
  );
  return null;
}

export default function AppLayout() {
  return (
    <PermissionsProvider>
    <BusinessSettingsProvider>
    <ClientsProvider>
      <ServicesProvider>
        <StaffProvider>
          <WorkingHoursProvider>
            <TimeOffProvider>
              <AccountingProvider>
                <ExpensesProvider>
                  <InvoicesProvider>
                    <ProductsProvider>
                      <SalesProvider>
                        <FeatureSetupProvider>
                          <InventoryProvider>
                            <SMSProvider>
                              <VendorProvider>
                                <AppointmentsProvider>
                                  <AppointmentFormProvider>
                                    <SessionPermissionsConfig />
                                    <TwoFactorRequiredAlert />
                                    <Stack screenOptions={{ headerShown: false }} />
                                  </AppointmentFormProvider>
                                </AppointmentsProvider>
                              </VendorProvider>
                            </SMSProvider>
                          </InventoryProvider>
                        </FeatureSetupProvider>
                      </SalesProvider>
                    </ProductsProvider>
                  </InvoicesProvider>
                </ExpensesProvider>
              </AccountingProvider>
            </TimeOffProvider>
          </WorkingHoursProvider>
        </StaffProvider>
      </ServicesProvider>
    </ClientsProvider>
    </BusinessSettingsProvider>
    </PermissionsProvider>
  );
}
