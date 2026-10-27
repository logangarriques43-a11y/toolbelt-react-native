/**
 * FormSheet — the full-height modal used by the sign-in and security flows
 * (authenticator code, backup code, password confirm, 2FA setup, staff access).
 * "Cancel · Title · action" header over a keyboard-aware body, on the plain
 * theme background like the other redesigned sheets.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { useAppTheme } from '@/theme/theme-context';

export function FormSheet({
  visible,
  title,
  onClose,
  closeLabel = 'Cancel',
  actionLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  closeLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.side}>
              <Text style={[styles.close, { color: theme.accent }]}>{closeLabel}</Text>
            </Pressable>
            <Text style={[theme.display(20), styles.title]} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.side, styles.right]}>
              {actionLabel && onAction ? (
                actionLoading ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Pressable onPress={onAction} disabled={actionDisabled} hitSlop={8}>
                    <Text
                      style={[
                        styles.action,
                        { color: actionDisabled ? theme.tertiaryText : theme.accent },
                      ]}>
                      {actionLabel}
                    </Text>
                  </Pressable>
                )
              ) : null}
            </View>
          </View>
          <KeyboardAwareForm contentContainerStyle={styles.body}>{children}</KeyboardAwareForm>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 70 },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  close: { fontSize: 16 },
  action: { fontSize: 16, fontWeight: '600' },
  body: { padding: 20, gap: 18, paddingBottom: 40 },
});
