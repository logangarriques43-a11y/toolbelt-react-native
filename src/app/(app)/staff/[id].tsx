/**
 * Staff detail — the shared StaffForm in edit mode, with the owner-only App
 * Access card docked underneath (Invite to App / Edit Access & Permissions,
 * reset password, revoke). Staff sessions and the owner's own row don't get the
 * card: only the owner can grant logins, and the owner already has one.
 */

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StaffAppAccessCard } from '@/components/staff/app-access-card';
import { StaffForm } from '@/components/staff-form';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff-store';

export default function EditStaff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useSession();
  const { findStaff } = useStaff();
  const member = id ? findStaff(id) : undefined;
  const showAccess = role === 'owner' && !!member && !member.isOwner;

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        <StaffForm editingId={id} />
      </View>
      {showAccess && member ? <StaffAppAccessCard member={member} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
