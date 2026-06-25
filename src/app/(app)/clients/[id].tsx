import { useLocalSearchParams } from 'expo-router';

import { ClientForm } from '@/components/client-form';

export default function EditClient() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClientForm editingId={id} />;
}
