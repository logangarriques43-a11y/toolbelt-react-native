import { useLocalSearchParams } from 'expo-router';

import { ServiceForm } from '@/components/service-form';

export default function EditService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ServiceForm editingId={id} />;
}
