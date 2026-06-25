import { useLocalSearchParams } from 'expo-router';

import { StaffForm } from '@/components/staff-form';

export default function EditStaff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffForm editingId={id} />;
}
