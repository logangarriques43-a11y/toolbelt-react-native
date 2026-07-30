import { Stack } from 'expo-router';
import { useEffect } from 'react';

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

/**
 * Authenticated business-owner stack. Dashboard hub + feature screens.
 * Data stores (clients, services, appointments, staff, …) are scoped to the signed-in area.
 */
/**
 * Configures the permission session as owner on entry. The RN app has no
 * staff-login flow yet (Firebase auth = Stream B), so the authenticated area is
 * always the owner; when staff login lands, it would call configureAsStaff.
 */
function OwnerConfig() {
  const { configureAsOwner } = usePermissions();
  useEffect(() => { configureAsOwner(); }, [configureAsOwner]);
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
                                    <OwnerConfig />
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
